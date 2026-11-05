import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Interval } from '@nestjs/schedule';
import { subMilliseconds } from 'date-fns';
import { RequestContext } from 'nestjs-request-context';
import { RideEntity } from '@modules/ride/domain/ride.entity';
import { ExpireRideOfferCommand } from '@modules/ride/commands/expire-ride-offer/expire-ride-offer.command';
import { RideRepositoryPort } from '@modules/ride/database/ride.repository.port';
import { RIDE_REPOSITORY } from '@modules/ride/ride.di-tokens';

const everyMinuteMs = 60_000;

// Expires an offer the driver did not answer in time, so the ride goes to
// the next driver. Each timer is kept in memory and lost when the server
// restarts: the offers left pending are then found in Postgres at startup
// and every minute, and expired the same way, up to a minute late.
// https://docs.nestjs.com/techniques/task-scheduling
@Injectable()
export class RideOfferTimer implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(RideOfferTimer.name);
  private readonly timers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly commandBus: CommandBus,
    @Inject(RIDE_REPOSITORY) private readonly rideRepo: RideRepositoryPort,
  ) {}

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

  // The offers pending while the server was stopped expire at once.
  onApplicationBootstrap(): void {
    void this.expireOverdueOffers();
  }

  @Interval(everyMinuteMs)
  async onEveryMinute(): Promise<void> {
    await this.expireOverdueOffers();
  }

  onModuleDestroy(): void {
    this.timers.forEach((timer) => clearTimeout(timer));
  }

  // An offer also expired by its timer meanwhile is simply not pending
  // anymore: the command does nothing.
  private async expireOverdueOffers(): Promise<void> {
    const context = new RequestContext({ requestId: 'overdue-offers' }, {});
    await RequestContext.cls.run(context, async () => {
      try {
        const overdue = await this.rideRepo.findOverdueOffers(
          subMilliseconds(new Date(), RideEntity.offerResponseTimeMs),
        );
        for (const { rideId, offerId } of overdue) {
          await this.expire(rideId, offerId);
        }
      } catch (error) {
        this.logger.error('Overdue offers not expired', error);
      }
    });
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
