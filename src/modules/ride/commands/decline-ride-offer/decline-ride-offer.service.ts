import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import { RideEntity } from '@modules/ride/domain/ride.entity';
import {
  RideNotFoundError,
  RideOfferNotPendingError,
} from '@modules/ride/domain/ride.errors';
import { RideRepositoryPort } from '@modules/ride/database/ride.repository.port';
import { RIDE_REALTIME, RIDE_REPOSITORY } from '@modules/ride/ride.di-tokens';
import { RideRealtimePort } from '@modules/ride/application/ports/ride-realtime.port';
import { RideDispatcher } from '@modules/ride/application/ride-dispatcher';
import { RideOfferTimer } from '@modules/ride/application/ride-offer-timer';
import { DeclineRideOfferCommand } from './decline-ride-offer.command';

type Declined = { ride: RideEntity; offerId: string };

@CommandHandler(DeclineRideOfferCommand)
export class DeclineRideOfferService implements ICommandHandler {
  constructor(
    @Inject(RIDE_REPOSITORY) private readonly rideRepo: RideRepositoryPort,
    @Inject(RIDE_REALTIME) private readonly realtime: RideRealtimePort,
    private readonly dispatcher: RideDispatcher,
    private readonly offerTimer: RideOfferTimer,
  ) {}

  async execute(
    command: DeclineRideOfferCommand,
  ): Promise<Result<void, RideNotFoundError | RideOfferNotPendingError>> {
    const result = await this.rideRepo.transaction(() => this.decline(command));
    if (result.isErr()) return Err(result.unwrapErr());

    const { ride, offerId } = result.unwrap();
    this.offerTimer.stop(offerId);
    await this.realtime.withdrawOffer(command.driverId);
    await this.dispatcher.offerToNextDriver(ride);
    return Ok(undefined);
  }

  private async decline(
    command: DeclineRideOfferCommand,
  ): Promise<Result<Declined, RideNotFoundError | RideOfferNotPendingError>> {
    const found = await this.rideRepo.findOneByIdForUpdate(command.rideId);
    if (found.isNone()) return Err(new RideNotFoundError());

    const ride = found.unwrap();
    const offerId = ride.pendingOffer?.id;
    const declined = ride.decline(command.driverId, new Date());
    if (declined.isErr() || !offerId)
      return Err(new RideOfferNotPendingError());

    await this.rideRepo.save(ride);
    return Ok({ ride, offerId });
  }
}
