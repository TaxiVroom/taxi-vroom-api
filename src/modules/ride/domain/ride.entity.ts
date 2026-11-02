import { AggregateID, AggregateRoot } from '@libs/ddd';
import { ArgumentInvalidException } from '@libs/exceptions';
import { randomInt, randomUUID } from 'crypto';
import { distanceBetween } from 'geofire-common';
import { Err, None, Ok, Option, Result, Some } from 'oxide.ts';
import {
  BoardingCodeLockedError,
  NoDriverAvailableError,
  NoShowTooEarlyError,
  RideAlreadyRatedError,
  RideEstimateExpiredError,
  RideNotAssignedToDriverError,
  RideNotOwnedByPassengerError,
  RideNotSearchingDriverError,
  RideOfferAlreadyPendingError,
  RideOfferNotPendingError,
  RideWrongStepError,
  WrongBoardingCodeError,
} from './ride.errors';
import {
  AcceptedRideOffer,
  DriverCandidate,
  EstimateRideProps,
  ExpiredRideOffer,
  PendingRideOffer,
  RideCompliment,
  RideCompletion,
  RideOffer,
  RideOfferStatus,
  RidePosition,
  RideProps,
  RideStatus,
  RideSupplement,
} from './ride.types';
import { estimateFare } from './taxi-fare';

export class RideEntity extends AggregateRoot<RideProps> {
  protected readonly _id: AggregateID;

  // Further away, the taxi would take too long to come: the same radius as
  // the taxis shown around the passenger.
  static readonly reachableRadiusMeters = 5000;

  // The time a driver has to answer an offer.
  static readonly offerResponseTimeMs = 15_000;

  // Shown instead of the address when it cannot be found.
  static readonly unnamedPickup = 'Position de départ';

  // Uber's way: an estimate can be ordered for a few minutes, then the taxis
  // moved and the traffic changed.
  static readonly estimateValidityMs = 5 * 60_000;

  // The price shown before ordering, computed from the closest free taxi:
  // nobody is told about the ride yet.
  static estimate(props: EstimateRideProps): RideEntity {
    const { tariff, route, publicHolidays, now } = props;
    return new RideEntity({
      id: randomUUID(),
      createdAt: now,
      props: {
        passengerId: props.passengerId,
        origin: props.origin,
        destination: props.destination,
        estimatedPrice: estimateFare(tariff, route, now, publicHolidays),
        tariffId: tariff.id,
        step: { status: RideStatus.estimated },
        offers: [],
      },
    });
  }

  // The taxi that would come, whose approach is part of the price.
  static approachingDriver(
    pickup: RidePosition,
    candidates: DriverCandidate[],
  ): Result<DriverCandidate, NoDriverAvailableError> {
    const driver = RideEntity.closestFreeDriver(pickup, candidates);
    return driver ? Ok(driver) : Err(new NoDriverAvailableError());
  }

  // Uber's limit: then the driver calls the passenger, or cancels.
  static readonly maxBoardingCodeAttempts = 5;

  // Uber's and Bolt's wait at the pickup before the passenger counts as
  // absent.
  static readonly noShowWaitMs = 5 * 60_000;

  // Until the passenger is in the taxi.
  private static readonly cancellableStatuses = [
    RideStatus.searchingDriver,
    RideStatus.driverEnRoute,
    RideStatus.driverArrived,
  ];

  private static readonly withdrawableStatuses = [
    RideStatus.driverEnRoute,
    RideStatus.driverArrived,
  ];

  // The statuses where one driver has the ride.
  private static readonly withDriverStatuses = [
    RideStatus.driverEnRoute,
    RideStatus.driverArrived,
    RideStatus.inProgress,
    RideStatus.completed,
    RideStatus.passengerNoShow,
  ];

  get status(): RideStatus {
    return this.props.step.status;
  }

  // While the passenger waits for the driver and tells it at pickup.
  get boardingCode(): string | undefined {
    const step = this.props.step;
    return step.status === RideStatus.driverEnRoute ||
      step.status === RideStatus.driverArrived
      ? step.boardingCode.code
      : undefined;
  }

  // The driver whose offer was accepted, once there is one.
  get driverId(): string | undefined {
    return this.acceptedOffer?.driverId;
  }

  // Once a driver took the ride, and while they keep it.
  get acceptedOffer(): AcceptedRideOffer | undefined {
    return this.props.offers.find(
      (offer): offer is AcceptedRideOffer =>
        offer.status === RideOfferStatus.accepted,
    );
  }

  // At the end of the ride, for the passenger's receipt.
  get completion(): RideCompletion | undefined {
    const step = this.props.step;
    return step.status === RideStatus.completed ? step.completion : undefined;
  }

  get pendingOffer(): PendingRideOffer | undefined {
    return this.props.offers.find(
      (offer): offer is PendingRideOffer =>
        offer.status === RideOfferStatus.pending,
    );
  }

  // "Commander": the passenger orders the estimated ride, at its price.
  request(
    passengerId: string,
    now: Date,
  ): Result<
    void,
    RideNotOwnedByPassengerError | RideWrongStepError | RideEstimateExpiredError
  > {
    if (this.props.passengerId !== passengerId) {
      return Err(new RideNotOwnedByPassengerError());
    }
    if (this.status !== RideStatus.estimated) {
      return Err(new RideWrongStepError());
    }
    const ageMs = now.getTime() - this.createdAt.getTime();
    if (ageMs > RideEntity.estimateValidityMs) {
      return Err(new RideEstimateExpiredError());
    }
    this.props.step = { status: RideStatus.searchingDriver };
    return Ok(undefined);
  }

  // Proposes the ride to the closest free driver within reach who was not
  // asked yet. Without one, the search stops and None is returned.
  offerToClosestDriver(
    candidates: DriverCandidate[],
    now: Date,
  ): Result<
    Option<PendingRideOffer>,
    RideNotSearchingDriverError | RideOfferAlreadyPendingError
  > {
    if (this.status !== RideStatus.searchingDriver) {
      return Err(new RideNotSearchingDriverError());
    }
    if (this.pendingOffer) return Err(new RideOfferAlreadyPendingError());

    const driverId = this.closestReachableDriver(candidates);
    if (!driverId) {
      this.props.step = {
        status: RideStatus.noDriverFound,
        noDriverFoundAt: now,
      };
      return Ok(None);
    }
    const offer: PendingRideOffer = {
      id: randomUUID(),
      driverId,
      status: RideOfferStatus.pending,
      offeredAt: now,
    };
    this.props.offers.push(offer);
    return Ok(Some(offer));
  }

  // The driver takes the ride: the passenger gets a boarding code.
  accept(driverId: string, now: Date): Result<void, RideOfferNotPendingError> {
    const offer = this.pendingOffer;
    if (!offer || offer.driverId !== driverId) {
      return Err(new RideOfferNotPendingError());
    }
    this.replaceOffer({
      ...offer,
      status: RideOfferStatus.accepted,
      acceptedAt: now,
    });
    this.props.step = {
      status: RideStatus.driverEnRoute,
      boardingCode: {
        code: randomInt(0, 10_000).toString().padStart(4, '0'),
        failedAttempts: 0,
      },
    };
    return Ok(undefined);
  }

  // "Je suis arrivé": the driver waits for the passenger at the pickup.
  arrive(
    driverId: string,
    now: Date,
  ): Result<void, RideNotAssignedToDriverError | RideWrongStepError> {
    if (this.driverId !== driverId) {
      return Err(new RideNotAssignedToDriverError());
    }
    const step = this.props.step;
    if (step.status !== RideStatus.driverEnRoute) {
      return Err(new RideWrongStepError());
    }
    this.props.step = {
      status: RideStatus.driverArrived,
      boardingCode: step.boardingCode,
      arrivedAt: now,
    };
    return Ok(undefined);
  }

  // "Démarrer la course" with the code the passenger told. A wrong code is
  // counted, so the ride must be saved even when this fails.
  start(
    driverId: string,
    code: string,
    now: Date,
  ): Result<
    void,
    | RideNotAssignedToDriverError
    | RideWrongStepError
    | WrongBoardingCodeError
    | BoardingCodeLockedError
  > {
    if (this.driverId !== driverId) {
      return Err(new RideNotAssignedToDriverError());
    }
    const step = this.props.step;
    if (step.status !== RideStatus.driverArrived) {
      return Err(new RideWrongStepError());
    }
    const { boardingCode } = step;
    if (boardingCode.failedAttempts >= RideEntity.maxBoardingCodeAttempts) {
      return Err(new BoardingCodeLockedError());
    }
    if (code !== boardingCode.code) {
      // Maybe lock the ride: two attempts at once could count as one.
      const failedAttempts = boardingCode.failedAttempts + 1;
      this.props.step = {
        ...step,
        boardingCode: { ...boardingCode, failedAttempts },
      };
      return Err(
        new WrongBoardingCodeError(
          RideEntity.maxBoardingCodeAttempts - failedAttempts,
        ),
      );
    }
    this.props.step = {
      status: RideStatus.inProgress,
      arrivedAt: step.arrivedAt,
      startedAt: now,
    };
    return Ok(undefined);
  }

  // "Valider et repasser libre": the passenger is at their destination.
  complete(
    driverId: string,
    meterCents: number,
    supplements: RideSupplement[],
    now: Date,
  ): Result<void, RideNotAssignedToDriverError | RideWrongStepError> {
    if (this.driverId !== driverId) {
      return Err(new RideNotAssignedToDriverError());
    }
    const step = this.props.step;
    if (step.status !== RideStatus.inProgress) {
      return Err(new RideWrongStepError());
    }
    this.props.step = {
      ...step,
      status: RideStatus.completed,
      completion: { completedAt: now, meterCents, supplements },
      rating: null,
    };
    return Ok(undefined);
  }

  // The passenger rates the driver, once, after the ride.
  rate(
    passengerId: string,
    stars: number,
    compliments: RideCompliment[],
    now: Date,
  ): Result<
    void,
    RideNotOwnedByPassengerError | RideWrongStepError | RideAlreadyRatedError
  > {
    if (this.props.passengerId !== passengerId) {
      return Err(new RideNotOwnedByPassengerError());
    }
    const step = this.props.step;
    if (step.status !== RideStatus.completed) {
      return Err(new RideWrongStepError());
    }
    if (step.rating) return Err(new RideAlreadyRatedError());

    this.props.step = {
      ...step,
      rating: { stars, compliments, ratedAt: now },
    };
    return Ok(undefined);
  }

  // What the passenger pays: the meter, then the supplements.
  get totalCents(): number | undefined {
    const step = this.props.step;
    if (step.status !== RideStatus.completed) return undefined;
    const { meterCents, supplements } = step.completion;
    return supplements.reduce(
      (total, s) => total + s.unitPriceCents * s.quantity,
      meterCents,
    );
  }

  // The passenger gives the ride up, for good, until they are in the taxi.
  // An offer waiting for an answer stops with the ride.
  cancel(
    passengerId: string,
    now: Date,
  ): Result<void, RideNotOwnedByPassengerError | RideWrongStepError> {
    if (this.props.passengerId !== passengerId) {
      return Err(new RideNotOwnedByPassengerError());
    }
    if (!RideEntity.cancellableStatuses.includes(this.status)) {
      return Err(new RideWrongStepError());
    }
    const pending = this.pendingOffer;
    if (pending) {
      this.replaceOffer({
        ...pending,
        status: RideOfferStatus.expired,
        expiredAt: now,
      });
    }
    this.props.step = { status: RideStatus.cancelled, cancelledAt: now };
    return Ok(undefined);
  }

  // The driver gives the ride up before the passenger got in: it goes to the
  // next driver, never to them again.
  withdraw(
    driverId: string,
    now: Date,
  ): Result<void, RideNotAssignedToDriverError | RideWrongStepError> {
    const accepted = this.acceptedOffer;
    if (!accepted || accepted.driverId !== driverId) {
      return Err(new RideNotAssignedToDriverError());
    }
    if (!RideEntity.withdrawableStatuses.includes(this.status)) {
      return Err(new RideWrongStepError());
    }
    this.replaceOffer({
      ...accepted,
      status: RideOfferStatus.withdrawn,
      withdrawnAt: now,
    });
    this.props.step = { status: RideStatus.searchingDriver };
    return Ok(undefined);
  }

  // "Client absent", once the driver waited long enough at the pickup.
  reportNoShow(
    driverId: string,
    now: Date,
  ): Result<
    void,
    RideNotAssignedToDriverError | RideWrongStepError | NoShowTooEarlyError
  > {
    if (this.driverId !== driverId) {
      return Err(new RideNotAssignedToDriverError());
    }
    const step = this.props.step;
    if (step.status !== RideStatus.driverArrived) {
      return Err(new RideWrongStepError());
    }
    const waitedMs = now.getTime() - step.arrivedAt.getTime();
    if (waitedMs < RideEntity.noShowWaitMs)
      return Err(new NoShowTooEarlyError());

    this.props.step = {
      status: RideStatus.passengerNoShow,
      arrivedAt: step.arrivedAt,
      reportedAt: now,
    };
    return Ok(undefined);
  }

  decline(driverId: string, now: Date): Result<void, RideOfferNotPendingError> {
    const offer = this.pendingOffer;
    if (!offer || offer.driverId !== driverId) {
      return Err(new RideOfferNotPendingError());
    }
    this.replaceOffer({
      ...offer,
      status: RideOfferStatus.declined,
      declinedAt: now,
    });
    return Ok(undefined);
  }

  // The driver did not answer in time.
  expire(
    offerId: string,
    now: Date,
  ): Result<ExpiredRideOffer, RideOfferNotPendingError> {
    const offer = this.pendingOffer;
    if (!offer || offer.id !== offerId) {
      return Err(new RideOfferNotPendingError());
    }
    const expired: ExpiredRideOffer = {
      ...offer,
      status: RideOfferStatus.expired,
      expiredAt: now,
    };
    this.replaceOffer(expired);
    return Ok(expired);
  }

  validate(): void {
    const offers = this.props.offers;
    const pending = offers.filter((o) => o.status === RideOfferStatus.pending);
    const accepted = offers.filter(
      (o) => o.status === RideOfferStatus.accepted,
    );
    if (pending.length > 1) {
      throw new ArgumentInvalidException('Ride: one pending offer at most');
    }
    if (this.status === RideStatus.estimated && offers.length > 0) {
      throw new ArgumentInvalidException('Ride: no offer before the order');
    }
    if (pending.length === 1 && this.status !== RideStatus.searchingDriver) {
      throw new ArgumentInvalidException(
        'Ride: a pending offer only while searching a driver',
      );
    }
    // A cancelled ride may have had a driver, or not.
    if (this.status === RideStatus.cancelled) {
      if (accepted.length > 1) {
        throw new ArgumentInvalidException('Ride: one accepted offer at most');
      }
      return;
    }
    const hasDriver = RideEntity.withDriverStatuses.includes(this.status);
    if (accepted.length !== (hasDriver ? 1 : 0)) {
      throw new ArgumentInvalidException(
        'Ride: one accepted offer exactly while a driver has the ride',
      );
    }
  }

  private closestReachableDriver(
    candidates: DriverCandidate[],
  ): string | undefined {
    const alreadyAsked = new Set(this.props.offers.map((o) => o.driverId));
    return RideEntity.closestFreeDriver(
      this.props.origin,
      candidates.filter((c) => !alreadyAsked.has(c.driverId)),
    )?.driverId;
  }

  private static closestFreeDriver(
    pickup: RidePosition,
    candidates: DriverCandidate[],
  ): DriverCandidate | undefined {
    return candidates
      .filter((c) => !c.isBusy)
      .map((c) => ({ candidate: c, meters: RideEntity.metersTo(pickup, c) }))
      .filter((c) => c.meters <= RideEntity.reachableRadiusMeters)
      .sort((a, b) => a.meters - b.meters)[0]?.candidate;
  }

  private static metersTo(
    pickup: RidePosition,
    candidate: DriverCandidate,
  ): number {
    const kilometers = distanceBetween(
      [candidate.latitude, candidate.longitude],
      [pickup.latitude, pickup.longitude],
    );
    return kilometers * 1000;
  }

  private replaceOffer(answered: RideOffer): void {
    this.props.offers = this.props.offers.map((offer) =>
      offer.id === answered.id ? answered : offer,
    );
  }
}
