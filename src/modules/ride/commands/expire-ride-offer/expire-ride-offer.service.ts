import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Ok, Result } from 'oxide.ts';
import { RideEntity } from '@modules/ride/domain/ride.entity';
import { ExpiredRideOffer } from '@modules/ride/domain/ride.types';
import { RideRepositoryPort } from '@modules/ride/database/ride.repository.port';
import { RIDE_REALTIME, RIDE_REPOSITORY } from '@modules/ride/ride.di-tokens';
import { RideRealtimePort } from '@modules/ride/application/ports/ride-realtime.port';
import { RideDispatcher } from '@modules/ride/application/ride-dispatcher';
import { ExpireRideOfferCommand } from './expire-ride-offer.command';

type Expired = { ride: RideEntity; offer: ExpiredRideOffer };

// Started by RideOfferTimer once the driver's time to answer is up.
@CommandHandler(ExpireRideOfferCommand)
export class ExpireRideOfferService implements ICommandHandler {
  constructor(
    @Inject(RIDE_REPOSITORY) private readonly rideRepo: RideRepositoryPort,
    @Inject(RIDE_REALTIME) private readonly realtime: RideRealtimePort,
    private readonly dispatcher: RideDispatcher,
  ) {}

  async execute(command: ExpireRideOfferCommand): Promise<Result<void, never>> {
    const expired = await this.rideRepo.transaction(() => this.expire(command));
    // Answered just in time: nothing to do.
    if (!expired) return Ok(undefined);

    await this.realtime.withdrawOffer(expired.offer.driverId);
    await this.dispatcher.offerToNextDriver(expired.ride);
    return Ok(undefined);
  }

  private async expire(
    command: ExpireRideOfferCommand,
  ): Promise<Expired | undefined> {
    const found = await this.rideRepo.findOneById(command.rideId);
    if (found.isNone()) return undefined;

    const ride = found.unwrap();
    const expired = ride.expire(command.offerId, new Date());
    if (expired.isErr()) return undefined;

    await this.rideRepo.save(ride);
    return { ride, offer: expired.unwrap() };
  }
}
