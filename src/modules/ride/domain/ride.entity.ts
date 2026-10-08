import { AggregateID, AggregateRoot } from '@libs/ddd';
import { ArgumentInvalidException } from '@libs/exceptions';
import { createHash, randomInt, randomUUID } from 'crypto';
import { distanceBetween } from 'geofire-common';
import { Err, None, Ok, Option, Result, Some } from 'oxide.ts';
import {
  RideNotSearchingDriverError,
  RideOfferAlreadyPendingError,
  RideOfferNotPendingError,
} from './ride.errors';
import {
  CreateRideProps,
  DriverCandidate,
  ExpiredRideOffer,
  PendingRideOffer,
  RideOffer,
  RideOfferStatus,
  RideProps,
  RideStatus,
} from './ride.types';

export class RideEntity extends AggregateRoot<RideProps> {
  protected readonly _id: AggregateID;

  // Further away, the taxi would take too long to come: the same radius as
  // the taxis shown around the passenger.
  static readonly reachableRadiusMeters = 5000;

  // The time a driver has to answer an offer.
  static readonly offerResponseTimeMs = 15_000;

  static request(props: CreateRideProps): RideEntity {
    return new RideEntity({
      id: randomUUID(),
      props: {
        ...props,
        step: { status: RideStatus.searchingDriver },
        offers: [],
      },
    });
  }

  static hashBoardingCode(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }

  get status(): RideStatus {
    return this.props.step.status;
  }

  // The driver whose offer was accepted, once there is one.
  get driverId(): string | undefined {
    return this.props.offers.find(
      (offer) => offer.status === RideOfferStatus.accepted,
    )?.driverId;
  }

  get pendingOffer(): PendingRideOffer | undefined {
    return this.props.offers.find(
      (offer): offer is PendingRideOffer =>
        offer.status === RideOfferStatus.pending,
    );
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

  // The driver takes the ride. Returns the boarding code to give the
  // passenger: only its hash is kept.
  accept(
    driverId: string,
    now: Date,
  ): Result<string, RideOfferNotPendingError> {
    const offer = this.pendingOffer;
    if (!offer || offer.driverId !== driverId) {
      return Err(new RideOfferNotPendingError());
    }
    this.replaceOffer({
      ...offer,
      status: RideOfferStatus.accepted,
      acceptedAt: now,
    });
    const boardingCode = randomInt(0, 10_000).toString().padStart(4, '0');
    this.props.step = {
      status: RideStatus.driverEnRoute,
      boardingCodeHash: RideEntity.hashBoardingCode(boardingCode),
    };
    return Ok(boardingCode);
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
    if (pending.length === 1 && this.status !== RideStatus.searchingDriver) {
      throw new ArgumentInvalidException(
        'Ride: a pending offer only while searching a driver',
      );
    }
    const hasDriver = this.status === RideStatus.driverEnRoute;
    if (accepted.length !== (hasDriver ? 1 : 0)) {
      throw new ArgumentInvalidException(
        'Ride: one accepted offer exactly once a driver is en route',
      );
    }
  }

  private closestReachableDriver(
    candidates: DriverCandidate[],
  ): string | undefined {
    const alreadyAsked = new Set(this.props.offers.map((o) => o.driverId));
    return candidates
      .filter((c) => !c.isBusy && !alreadyAsked.has(c.driverId))
      .map((c) => ({ driverId: c.driverId, meters: this.metersToPickup(c) }))
      .filter((c) => c.meters <= RideEntity.reachableRadiusMeters)
      .sort((a, b) => a.meters - b.meters)[0]?.driverId;
  }

  private metersToPickup(candidate: DriverCandidate): number {
    const { latitude, longitude } = this.props.origin;
    const kilometers = distanceBetween(
      [candidate.latitude, candidate.longitude],
      [latitude, longitude],
    );
    return kilometers * 1000;
  }

  private replaceOffer(answered: RideOffer): void {
    this.props.offers = this.props.offers.map((offer) =>
      offer.id === answered.id ? answered : offer,
    );
  }
}
