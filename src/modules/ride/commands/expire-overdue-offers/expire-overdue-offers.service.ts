import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Ok, Result } from 'oxide.ts';
import { RideEntity } from '@modules/ride/domain/ride.entity';
import { ExpiredRideOffer } from '@modules/ride/domain/ride.types';
import { RideRepositoryPort } from '@modules/ride/database/ride.repository.port';
import { RIDE_REALTIME, RIDE_REPOSITORY } from '@modules/ride/ride.di-tokens';
import { RideRealtimePort } from '@modules/ride/application/ports/ride-realtime.port';
import { RideDispatcher } from '@modules/ride/application/ride-dispatcher';
import { ExpireOverdueOffersCommand } from './expire-overdue-offers.command';

// A ride, and its offer just expired.
interface ExpiredOffer {
  ride: RideEntity;
  offer: ExpiredRideOffer;
}

// Started by RideOfferTimer at startup and every minute: the offers whose
// in-memory timer was lost expire like the others, and each ride goes to the
// next driver. The rides are loaded and locked together, not one per offer.
@CommandHandler(ExpireOverdueOffersCommand)
export class ExpireOverdueOffersService implements ICommandHandler {
  constructor(
    @Inject(RIDE_REPOSITORY) private readonly rideRepo: RideRepositoryPort,
    @Inject(RIDE_REALTIME) private readonly realtime: RideRealtimePort,
    private readonly dispatcher: RideDispatcher,
  ) {}

  async execute(
    command: ExpireOverdueOffersCommand,
  ): Promise<Result<void, never>> {
    const expired = await this.rideRepo.transaction(() =>
      this.expire(command.offeredBefore),
    );
    // After the commit, as for one offer: the driver no longer has to
    // answer, and the search goes on.
    for (const { ride, offer } of expired) {
      await this.realtime.withdrawOffer(offer.driverId);
      await this.dispatcher.offerToNextDriver(ride);
    }
    return Ok(undefined);
  }

  private async expire(offeredBefore: Date): Promise<ExpiredOffer[]> {
    const rides = await this.rideRepo.lockRidesWithOverdueOffers(offeredBefore);
    const now = new Date();
    const expired: ExpiredOffer[] = [];
    for (const ride of rides) {
      const pending = ride.pendingOffer;
      if (!pending) continue;
      const offer = ride.expire(pending.id, now);
      if (offer.isErr()) continue;
      await this.rideRepo.save(ride);
      expired.push({ ride, offer: offer.unwrap() });
    }
    return expired;
  }
}
