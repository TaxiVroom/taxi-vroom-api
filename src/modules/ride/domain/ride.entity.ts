import { AggregateID, AggregateRoot } from '@libs/ddd';
import { ArgumentInvalidException } from '@libs/exceptions';
import { randomInt, randomUUID } from 'crypto';
import {
  addDays,
  addMinutes,
  differenceInMilliseconds,
  differenceInMinutes,
  isAfter,
  isBefore,
  max,
} from 'date-fns';
import { distanceBetween } from 'geofire-common';
import { RideEndedDomainEvent } from './events/ride-ended.domain-event';
import { Err, None, Ok, Option, Result, Some } from 'oxide.ts';
import {
  BoardingCodeLockedError,
  NoDriverAvailableError,
  NoShowTooEarlyError,
  RideAlreadyRatedError,
  RideBookingOverlapError,
  RideDriverDocumentsEndBeforeError,
  RideBookingTakenError,
  RideDriverBusyError,
  RideEstimateExpiredError,
  RideInvalidPassengerSupplementError,
  RideNotAssignedToDriverError,
  RideNotEnoughSeatsError,
  RideNotOwnedByPassengerError,
  RideNotSearchingDriverError,
  RideOfferAlreadyPendingError,
  RideOfferNotPendingError,
  RidePickupTimeNotBookableError,
  RideWrongStepError,
  WrongBoardingCodeError,
} from './ride.errors';
import {
  AcceptedRideOffer,
  BoardingCode,
  BookingStart,
  DriverCandidate,
  EstimateBookedRideProps,
  EstimateRideProps,
  ExpiredRideOffer,
  PendingRideOffer,
  RideCompliment,
  RideCompletion,
  RideKind,
  RideOffer,
  RideOfferStatus,
  RidePosition,
  RideProps,
  RideSchedule,
  RideStatus,
  RideSupplement,
  ScheduleAlert,
  ScheduleAlertKind,
} from './ride.types';
import {
  estimateBookedFare,
  estimateFare,
  supplementPassengerCount,
} from './taxi-fare';

export class RideEntity extends AggregateRoot<RideProps> {
  protected readonly _id: AggregateID;

  // Further away, the taxi would take too long to come: the same radius as
  // the taxis shown around the passenger.
  static readonly reachableRadiusMeters = 5000;

  // The time a driver has to answer an offer.
  static readonly offerResponseTimeMs = 15_000;

  // Shown instead of the address when it cannot be found.
  static readonly unnamedPickup = 'Position de départ';

  // An estimate can be ordered for a few minutes, then the taxis moved and
  // the traffic changed.
  static readonly estimateValidityMs = 5 * 60_000;

  // A booked taxi needs time to be found: no pickup sooner. The app offers
  // the same slots.
  static readonly bookingMinimumLeadMinutes = 30;

  // The app offers today and the next 30 days, until that day's last slot.
  static readonly bookableDays = 31;

  // A booking's deadline, this long before its pickup: its committed driver
  // must be online, or it goes to another taxi, which has the time to come.
  static readonly bookingDepartureLeadMinutes = 30;

  // The committed driver is reminded to go online this long before the
  // pickup.
  static readonly bookingReminderLeadMinutes = 45;

  // The committed driver leaves this long before the pickup at the latest:
  // a backup taxi within reach can still come about on time.
  static readonly bookingDepartureDeadlineMinutes = 10;

  // Drivers see the bookings this far around them: a booking is often
  // looked at from home, far from its pickup.
  static readonly bookingsVisibleRadiusMeters = 20_000;

  // A driver cannot be on time for two pickups closer than this.
  static readonly bookingsMinimumGapMinutes = 60;

  // The id of the "5e passager et plus" line of the end of ride.
  static readonly fifthPassengerSupplementId = 'fifth-passenger';

  // The price shown before ordering, computed from the closest free taxi:
  // nobody is told about the ride yet.
  static estimate(props: EstimateRideProps): RideEntity {
    const { tariff, route, publicHolidays, now } = props;
    return new RideEntity({
      id: randomUUID(),
      createdAt: now,
      props: {
        passengerId: props.passengerId,
        timing: { kind: RideKind.immediate },
        origin: props.origin,
        destination: props.destination,
        estimatedPrice: estimateFare(
          tariff,
          route,
          now,
          publicHolidays,
          props.passengerCount,
        ),
        passengerCount: props.passengerCount,
        tariffId: tariff.id,
        step: { status: RideStatus.estimated },
        offers: [],
      },
    });
  }

  // The price of a ride booked for later, at the tariff of its pickup time:
  // its taxi is not known yet.
  static estimateBooked(
    props: EstimateBookedRideProps,
  ): Result<RideEntity, RidePickupTimeNotBookableError> {
    const { tariff, trip, pickupAt, publicHolidays, now } = props;
    if (!RideEntity.isBookable(pickupAt, now)) {
      return Err(new RidePickupTimeNotBookableError());
    }
    return Ok(
      new RideEntity({
        id: randomUUID(),
        createdAt: now,
        props: {
          passengerId: props.passengerId,
          timing: {
            kind: RideKind.scheduled,
            schedule: {
              pickupAt,
              tripMeters: Math.round(trip.reduce((m, s) => m + s.meters, 0)),
              driver: null,
              withdrawals: [],
              refusals: [],
              alerts: [],
            },
          },
          origin: props.origin,
          destination: props.destination,
          estimatedPrice: estimateBookedFare(
            tariff,
            trip,
            pickupAt,
            publicHolidays,
            props.passengerCount,
          ),
          passengerCount: props.passengerCount,
          tariffId: tariff.id,
          step: { status: RideStatus.estimated },
          offers: [],
        },
      }),
    );
  }

  static isBookable(pickupAt: Date, now: Date): boolean {
    const earliest = addMinutes(now, RideEntity.bookingMinimumLeadMinutes);
    const latest = addDays(now, RideEntity.bookableDays);
    return !isBefore(pickupAt, earliest) && isBefore(pickupAt, latest);
  }

  // The taxi that would come, whose approach is part of the price: free, and
  // with a seat for each passenger.
  static approachingDriver(
    pickup: RidePosition,
    passengerCount: number,
    candidates: DriverCandidate[],
  ): Result<DriverCandidate, NoDriverAvailableError> {
    const driver = RideEntity.closestFreeDriver(
      pickup,
      passengerCount,
      candidates,
    );
    return driver ? Ok(driver) : Err(new NoDriverAvailableError());
  }

  // Then the driver calls the passenger, or cancels.
  static readonly maxBoardingCodeAttempts = 5;

  // The wait at the pickup before the passenger counts as absent.
  static readonly noShowWaitMs = 5 * 60_000;

  // Until the passenger is in the taxi.
  private static readonly cancellableStatuses = [
    RideStatus.booked,
    RideStatus.driverAssigned,
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

  get kind(): RideKind {
    return this.props.timing.kind;
  }

  // Only for a ride booked in advance.
  get schedule(): RideSchedule | undefined {
    const timing = this.props.timing;
    return timing.kind === RideKind.scheduled ? timing.schedule : undefined;
  }

  // The driver committed to the booking, before it starts.
  get scheduledDriverId(): string | undefined {
    return this.schedule?.driver?.driverId;
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
    // A ride estimated for later is booked, not ordered.
    if (
      this.status !== RideStatus.estimated ||
      this.kind !== RideKind.immediate
    ) {
      return Err(new RideWrongStepError());
    }
    const ageMs = now.getTime() - this.createdAt.getTime();
    if (ageMs > RideEntity.estimateValidityMs) {
      return Err(new RideEstimateExpiredError());
    }
    this.props.step = { status: RideStatus.searchingDriver };
    return Ok(undefined);
  }

  // "Réserver le taxi": the passenger books the ride estimated for later, at
  // its price. It waits for a driver to commit to it.
  book(
    passengerId: string,
    now: Date,
  ): Result<
    void,
    | RideNotOwnedByPassengerError
    | RideWrongStepError
    | RideEstimateExpiredError
    | RidePickupTimeNotBookableError
  > {
    if (this.props.passengerId !== passengerId) {
      return Err(new RideNotOwnedByPassengerError());
    }
    const schedule = this.schedule;
    if (this.status !== RideStatus.estimated || !schedule) {
      return Err(new RideWrongStepError());
    }
    const ageMs = differenceInMilliseconds(now, this.createdAt);
    if (ageMs > RideEntity.estimateValidityMs) {
      return Err(new RideEstimateExpiredError());
    }
    // The estimate was made just before the limit.
    if (!RideEntity.isBookable(schedule.pickupAt, now)) {
      return Err(new RidePickupTimeNotBookableError());
    }
    this.props.step = { status: RideStatus.booked };
    return Ok(undefined);
  }

  // "Accepter" a booking: the driver commits to it. Their other bookings
  // tell whether they can be on time for this one.
  // A driver whose documents end before the pickup cannot take it: null
  // means no end. Spec docs/specs/documents-du-chauffeur.md.
  // A taxi with fewer seats than passengers cannot take it. Spec
  // docs/specs/nombre-de-passagers.md.
  acceptBooking(
    driverId: string,
    driverSeats: number,
    otherPickupTimes: Date[],
    driverInOrderUntil: Date | null,
    now: Date,
  ): Result<
    void,
    | RideWrongStepError
    | RideNotEnoughSeatsError
    | RideBookingTakenError
    | RideBookingOverlapError
    | RideDriverDocumentsEndBeforeError
  > {
    const schedule = this.schedule;
    if (this.status !== RideStatus.booked || !schedule) {
      return Err(new RideWrongStepError());
    }
    if (driverSeats < this.props.passengerCount) {
      return Err(new RideNotEnoughSeatsError());
    }
    if (driverInOrderUntil && !isAfter(driverInOrderUntil, schedule.pickupAt)) {
      return Err(new RideDriverDocumentsEndBeforeError());
    }
    if (schedule.driver) {
      return schedule.driver.driverId === driverId
        ? Ok(undefined)
        : Err(new RideBookingTakenError());
    }
    if (RideEntity.overlaps(schedule.pickupAt, otherPickupTimes)) {
      return Err(new RideBookingOverlapError());
    }
    schedule.driver = { driverId, acceptedAt: now };
    return Ok(undefined);
  }

  // The driver gives a booking up before it starts: other drivers can take
  // it again.
  withdrawFromBooking(
    driverId: string,
    now: Date,
  ): Result<void, RideNotAssignedToDriverError | RideWrongStepError> {
    const schedule = this.schedule;
    if (!schedule?.driver || schedule.driver.driverId !== driverId) {
      return Err(new RideNotAssignedToDriverError());
    }
    if (this.status !== RideStatus.booked) {
      return Err(new RideWrongStepError());
    }
    schedule.withdrawals.push({
      id: randomUUID(),
      ...schedule.driver,
      withdrawnAt: now,
    });
    schedule.driver = null;
    return Ok(undefined);
  }

  // "Refuser": the driver does not want the booking. Nobody waited for their
  // answer, so nobody is told; it is just never offered to them. A booking
  // they accepted is given up with withdrawFromBooking instead.
  refuseBooking(driverId: string, now: Date): Result<void, RideWrongStepError> {
    const schedule = this.schedule;
    if (this.status !== RideStatus.booked || !schedule) {
      return Err(new RideWrongStepError());
    }
    if (schedule.driver?.driverId === driverId) {
      return Err(new RideWrongStepError());
    }
    if (schedule.refusals.some((r) => r.driverId === driverId)) {
      return Ok(undefined);
    }
    schedule.refusals.push({ driverId, refusedAt: now });
    return Ok(undefined);
  }

  // 45 min before the pickup, the committed driver is told to go online
  // before the deadline, once.
  remindToGoOnline(now: Date): Result<void, RideWrongStepError> {
    const schedule = this.schedule;
    if (this.status !== RideStatus.booked || !schedule?.driver) {
      return Err(new RideWrongStepError());
    }
    const remindsAt = addMinutes(
      schedule.pickupAt,
      -RideEntity.bookingReminderLeadMinutes,
    );
    if (isBefore(now, remindsAt)) return Err(new RideWrongStepError());
    if (this.alert(ScheduleAlertKind.goOnline)) {
      return Err(new RideWrongStepError());
    }
    this.addAlert(ScheduleAlertKind.goOnline, now);
    return Ok(undefined);
  }

  // The deadline, 30 min before the pickup: the ride is its committed
  // driver's if they are online. Otherwise, or without one, a driver is
  // searched, never one who gave the booking up.
  startBooking(
    isCommittedDriverOnline: boolean,
    now: Date,
  ): Result<BookingStart, RideWrongStepError> {
    const schedule = this.schedule;
    if (this.status !== RideStatus.booked || !schedule) {
      return Err(new RideWrongStepError());
    }
    const deadline = addMinutes(
      schedule.pickupAt,
      -RideEntity.bookingDepartureLeadMinutes,
    );
    if (isBefore(now, deadline)) return Err(new RideWrongStepError());

    if (!schedule.driver) {
      this.props.step = { status: RideStatus.searchingDriver };
      return Ok(BookingStart.searching);
    }
    if (isCommittedDriverOnline) {
      this.props.step = { status: RideStatus.driverAssigned };
      return Ok(BookingStart.assigned);
    }
    this.removeCommittedDriver(now);
    return Ok(BookingStart.committedDriverRemoved);
  }

  // 10 min before the pickup, a committed driver who did not leave yet loses
  // the booking: another driver is searched, never them. Without this, the
  // ride would stay assigned forever. Once left, they keep it.
  removeDriverNotLeft(now: Date): Result<void, RideWrongStepError> {
    const schedule = this.schedule;
    if (this.status !== RideStatus.driverAssigned || !schedule) {
      return Err(new RideWrongStepError());
    }
    const latestDeparture = addMinutes(
      schedule.pickupAt,
      -RideEntity.bookingDepartureDeadlineMinutes,
    );
    if (isBefore(now, latestDeparture)) return Err(new RideWrongStepError());

    this.removeCommittedDriver(now);
    return Ok(undefined);
  }

  // "Je pars": the committed driver leaves for the pickup. The ride goes on
  // as after an accepted offer, which it gets.
  departForBooking(
    driverId: string,
    isBusy: boolean,
    now: Date,
  ): Result<
    void,
    RideNotAssignedToDriverError | RideWrongStepError | RideDriverBusyError
  > {
    if (this.scheduledDriverId !== driverId) {
      return Err(new RideNotAssignedToDriverError());
    }
    if (this.status !== RideStatus.driverAssigned) {
      return Err(new RideWrongStepError());
    }
    if (isBusy) return Err(new RideDriverBusyError());

    this.props.offers.push({
      id: randomUUID(),
      driverId,
      status: RideOfferStatus.accepted,
      offeredAt: now,
      acceptedAt: now,
    });
    this.props.step = {
      status: RideStatus.driverEnRoute,
      boardingCode: RideEntity.newBoardingCode(),
    };
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
      boardingCode: RideEntity.newBoardingCode(),
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
  // extraPassengerCents is the supplement of the ride's tariff.
  complete(
    driverId: string,
    meterCents: number,
    supplements: RideSupplement[],
    extraPassengerCents: number,
    now: Date,
  ): Result<
    void,
    | RideNotAssignedToDriverError
    | RideWrongStepError
    | RideInvalidPassengerSupplementError
  > {
    if (this.driverId !== driverId) {
      return Err(new RideNotAssignedToDriverError());
    }
    const step = this.props.step;
    if (step.status !== RideStatus.inProgress) {
      return Err(new RideWrongStepError());
    }
    if (!this.hasValidPassengerSupplement(supplements, extraPassengerCents)) {
      return Err(new RideInvalidPassengerSupplementError());
    }
    this.props.step = {
      ...step,
      status: RideStatus.completed,
      completion: { completedAt: now, meterCents, supplements },
      rating: null,
    };
    this.endFor(driverId);
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
    const driverId = this.driverId;
    this.props.step = { status: RideStatus.cancelled, cancelledAt: now };
    if (driverId) this.endFor(driverId);
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
    this.endFor(driverId);
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
    // A booked passenger is waited for from their pickup time when the
    // driver came early, like the arrêté says for Paris (art. 10).
    const pickupAt = this.schedule?.pickupAt;
    const waitsFrom = pickupAt
      ? max([step.arrivedAt, pickupAt])
      : step.arrivedAt;
    const waitedMs = differenceInMilliseconds(now, waitsFrom);
    if (waitedMs < RideEntity.noShowWaitMs)
      return Err(new NoShowTooEarlyError());

    this.props.step = {
      status: RideStatus.passengerNoShow,
      arrivedAt: step.arrivedAt,
      reportedAt: now,
    };
    this.endFor(driverId);
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

  // Told once saved: the driver module checks their documents, never in the
  // ride's way. Spec docs/specs/documents-du-chauffeur.md, point 15.
  private endFor(driverId: string): void {
    this.addEvent(new RideEndedDomainEvent({ aggregateId: this.id, driverId }));
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
    // A taxi has eight seats at most (code des transports, L3121-1).
    if (this.props.passengerCount < 1 || this.props.passengerCount > 8) {
      throw new ArgumentInvalidException('Ride: from 1 to 8 passengers');
    }
    const beforeOrder = [
      RideStatus.estimated,
      RideStatus.booked,
      RideStatus.driverAssigned,
    ];
    if (beforeOrder.includes(this.status) && offers.length > 0) {
      throw new ArgumentInvalidException('Ride: no offer before the order');
    }
    const bookingStatuses = [RideStatus.booked, RideStatus.driverAssigned];
    if (bookingStatuses.includes(this.status) && !this.schedule) {
      throw new ArgumentInvalidException('Ride: only a scheduled ride books');
    }
    if (this.status === RideStatus.driverAssigned && !this.scheduledDriverId) {
      throw new ArgumentInvalidException('Ride: assigned to its driver');
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

  // The closest free driver within reach who was never asked, and never
  // refused or gave up the booking.
  private closestReachableDriver(
    candidates: DriverCandidate[],
  ): string | undefined {
    const schedule = this.schedule;
    const excluded = new Set([
      ...this.props.offers.map((o) => o.driverId),
      ...(schedule?.refusals.map((r) => r.driverId) ?? []),
      ...(schedule?.withdrawals.map((w) => w.driverId) ?? []),
    ]);
    const notAsked = candidates.filter((c) => !excluded.has(c.driverId));
    return RideEntity.closestFreeDriver(
      this.props.origin,
      this.props.passengerCount,
      notAsked,
    )?.driverId;
  }

  // The "5e passager et plus" line is priced by the ride's tariff and never
  // counts more passengers than the ride has from the fifth. A ride without
  // the line is valid: the supplement is optional for the driver.
  private hasValidPassengerSupplement(
    supplements: RideSupplement[],
    extraPassengerCents: number,
  ): boolean {
    const line = supplements.find(
      (supplement) =>
        supplement.supplementId === RideEntity.fifthPassengerSupplementId,
    );
    if (!line) return true;
    return (
      line.unitPriceCents === extraPassengerCents &&
      line.quantity <= supplementPassengerCount(this.props.passengerCount)
    );
  }

  // The committed driver loses the booking before leaving, as if they had
  // given it up: another driver is searched, never them.
  private removeCommittedDriver(now: Date): void {
    const schedule = this.schedule;
    if (!schedule?.driver) return;
    schedule.withdrawals.push({
      id: randomUUID(),
      ...schedule.driver,
      withdrawnAt: now,
    });
    schedule.driver = null;
    this.props.step = { status: RideStatus.searchingDriver };
  }

  // The alert of this kind already sent to the committed driver.
  private alert(kind: ScheduleAlertKind): ScheduleAlert | undefined {
    const driverId = this.scheduledDriverId;
    return this.schedule?.alerts.find(
      (a) => a.driverId === driverId && a.kind === kind,
    );
  }

  private addAlert(kind: ScheduleAlertKind, now: Date): void {
    const schedule = this.schedule;
    if (!schedule?.driver) return;
    schedule.alerts.push({
      driverId: schedule.driver.driverId,
      kind,
      sentAt: now,
    });
  }

  private static newBoardingCode(): BoardingCode {
    return {
      code: randomInt(0, 10_000).toString().padStart(4, '0'),
      failedAttempts: 0,
    };
  }

  private static overlaps(pickupAt: Date, otherPickupTimes: Date[]): boolean {
    return otherPickupTimes.some(
      (other) =>
        Math.abs(differenceInMinutes(pickupAt, other)) <
        RideEntity.bookingsMinimumGapMinutes,
    );
  }

  private static closestFreeDriver(
    pickup: RidePosition,
    passengerCount: number,
    candidates: DriverCandidate[],
  ): DriverCandidate | undefined {
    return candidates
      .filter((c) => !c.isBusy && c.passengerSeats >= passengerCount)
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
