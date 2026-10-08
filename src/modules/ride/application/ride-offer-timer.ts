import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { RequestContext } from 'nestjs-request-context';
import { RideEntity } from '@modules/ride/domain/ride.entity';
import { ExpireRideOfferCommand } from '@modules/ride/commands/expire-ride-offer/expire-ride-offer.command';

// Expires an offer the driver did not answer in time, so the ride goes to
// the next driver. Kept in memory: an offer waiting when the server restarts
// is not expired.
@Injectable()
export class RideOfferTimer implements OnModuleDestroy {
  private readonly logger = new Logger(RideOfferTimer.name);
  private readonly timers = new Map<string, NodeJS.Timeout>();

  constructor(private readonly commandBus: CommandBus) {}

  start(rideId: string, offerId: string): void {
    const timer = setTimeout(
      () => void this.expire(rideId, offerId),
      RideEntity.offerResponseTimeMs,
    );
    this.timers.set(offerId, timer);
  }

  // The driver answered in time.
  stop(offerId: string): void {
    clearTimeout(this.timers.get(offerId));
    this.timers.delete(offerId);
  }

  onModuleDestroy(): void {
    this.timers.forEach((timer) => clearTimeout(timer));
  }

  // Outside any HTTP request: runs in its own request context, which commands,
  // transactions and exceptions rely on.
  private async expire(rideId: string, offerId: string): Promise<void> {
    this.timers.delete(offerId);
    const context = new RequestContext({ requestId: `expire-${offerId}` }, {});
    await RequestContext.cls.run(context, async () => {
      try {
        await this.commandBus.execute(
          new ExpireRideOfferCommand({ rideId, offerId }),
        );
      } catch (error) {
        this.logger.error(
          `Ride ${rideId}: offer ${offerId} not expired`,
          error,
        );
      }
    });
  }
}
