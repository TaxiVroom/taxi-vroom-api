import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import { AggregateID } from '@libs/ddd';
import { RideEntity } from '@modules/ride/domain/ride.entity';
import {
  RideNotFoundError,
  RideOfferNotPendingError,
} from '@modules/ride/domain/ride.errors';
import { RideRepositoryPort } from '@modules/ride/database/ride.repository.port';
import { RIDE_REALTIME, RIDE_REPOSITORY } from '@modules/ride/ride.di-tokens';
import { RideRealtimePort } from '@modules/ride/application/ports/ride-realtime.port';
import { RideOfferTimer } from '@modules/ride/application/ride-offer-timer';
import { RidePublisher } from '@modules/ride/application/ride-publisher';
import { AcceptRideOfferCommand } from './accept-ride-offer.command';

type Accepted = { ride: RideEntity; offerId: string };

@CommandHandler(AcceptRideOfferCommand)
export class AcceptRideOfferService implements ICommandHandler {
  constructor(
    @Inject(RIDE_REPOSITORY) private readonly rideRepo: RideRepositoryPort,
    @Inject(RIDE_REALTIME) private readonly realtime: RideRealtimePort,
    private readonly publisher: RidePublisher,
    private readonly offerTimer: RideOfferTimer,
  ) {}

  async execute(
    command: AcceptRideOfferCommand,
  ): Promise<
    Result<AggregateID, RideNotFoundError | RideOfferNotPendingError>
  > {
    const result = await this.rideRepo.transaction(() => this.accept(command));
    if (result.isErr()) return Err(result.unwrapErr());

    const { ride, offerId } = result.unwrap();
    this.offerTimer.stop(offerId);
    await this.realtime.withdrawOffer(command.driverId);
    await this.realtime.markDriverBusy(command.driverId);
    await this.publisher.publishRide(ride);
    return Ok(ride.id);
  }

  private async accept(
    command: AcceptRideOfferCommand,
  ): Promise<Result<Accepted, RideNotFoundError | RideOfferNotPendingError>> {
    const found = await this.rideRepo.findOneById(command.rideId);
    if (found.isNone()) return Err(new RideNotFoundError());

    const ride = found.unwrap();
    const offerId = ride.pendingOffer?.id;
    const accepted = ride.accept(command.driverId, new Date());
    if (accepted.isErr() || !offerId)
      return Err(new RideOfferNotPendingError());

    await this.rideRepo.save(ride);
    return Ok({ ride, offerId });
  }
}
