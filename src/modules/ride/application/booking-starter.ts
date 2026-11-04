import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { RequestContext } from 'nestjs-request-context';
import { RideEntity } from '@modules/ride/domain/ride.entity';
import { BookingStart } from '@modules/ride/domain/ride.types';
import { RideRepositoryPort } from '@modules/ride/database/ride.repository.port';
import {
  DRIVER_LOCATOR,
  RIDE_REALTIME,
  RIDE_REPOSITORY,
} from '@modules/ride/ride.di-tokens';
import { DriverLocatorPort } from './ports/driver-locator.port';
import { RideRealtimePort } from './ports/ride-realtime.port';
import { RideDispatcher } from './ride-dispatcher';
import { RideNotifier } from './ride-notifier';
import { RidePublisher } from './ride-publisher';

const everyMinuteMs = 60_000;

// A booking at its deadline, and what became of it.
interface StartedBooking {
  ride: RideEntity;
  outcome: BookingStart;
  committedDriverId: string | undefined;
}

// A booking taken back from its committed driver, who did not leave in time.
interface TakenBackBooking {
  ride: RideEntity;
  driverId: string;
}

// The bookings' timed steps, at fixed times: the reminder to the committed
// driver 45 min before the pickup, the deadline 30 min before, then the
// latest departure 10 min before. Read from Postgres
// each minute and at startup, so a restart loses none and a cancelled one is
// simply not found. Temporary: to move to a job queue (BullMQ or the like)
// once the app has more timed actions, spec reservations-a-l-avance.md.
// https://docs.nestjs.com/techniques/task-scheduling
@Injectable()
export class BookingStarter implements OnApplicationBootstrap {
  private readonly logger = new Logger(BookingStarter.name);

  // A run still going when the next one comes: the next one is skipped.
  private isRunning = false;

  constructor(
    @Inject(RIDE_REPOSITORY) private readonly rideRepo: RideRepositoryPort,
    @Inject(DRIVER_LOCATOR) private readonly driverLocator: DriverLocatorPort,
    @Inject(RIDE_REALTIME) private readonly realtime: RideRealtimePort,
    private readonly publisher: RidePublisher,
    private readonly notifier: RideNotifier,
    private readonly dispatcher: RideDispatcher,
  ) {}

  // The bookings due while the server was stopped start at once.
  onApplicationBootstrap(): void {
    void this.runEachMinute();
  }

  @Interval(everyMinuteMs)
  async onEveryMinute(): Promise<void> {
    await this.runEachMinute();
  }

  // Outside any HTTP request: runs in its own request context, which
  // transactions and exceptions rely on.
  private async runEachMinute(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    const context = new RequestContext(
      { requestId: `bookings-${Date.now()}` },
      {},
    );
    try {
      await RequestContext.cls.run(context, async () => {
        await this.remindCommittedDrivers();
        await this.startDueBookings();
        await this.takeBackBookingsNotLeft();
      });
    } catch (error) {
      this.logger.error('Bookings not handled', error);
    } finally {
      this.isRunning = false;
    }
  }

  // One booking per transaction: its row stays locked until it is saved.
  private async remindCommittedDrivers(): Promise<void> {
    for (;;) {
      const ride = await this.rideRepo.transaction(async () => {
        const found = await this.rideRepo.lockNextBookingToRemind(
          RideEntity.bookingReminderLeadMinutes,
        );
        if (found.isNone()) return undefined;
        const ride = found.unwrap();
        // The database and this server disagree on the time: next minute.
        if (ride.remindToGoOnline(new Date()).isErr()) return undefined;
        await this.rideRepo.save(ride);
        return ride;
      });
      const driverId = ride?.scheduledDriverId;
      if (!ride || !driverId) return;
      await this.notifier.goOnlineReminder(ride, driverId);
    }
  }

  private async startDueBookings(): Promise<void> {
    for (;;) {
      const started = await this.startNextDueBooking();
      if (!started) return;
      await this.announceStart(started);
    }
  }

  private async startNextDueBooking(): Promise<StartedBooking | undefined> {
    return this.rideRepo.transaction(async () => {
      const found = await this.rideRepo.lockNextDueBooking(
        RideEntity.bookingDepartureLeadMinutes,
      );
      if (found.isNone()) return undefined;
      const ride = found.unwrap();
      const committedDriverId = ride.scheduledDriverId;
      const isOnline = committedDriverId
        ? (
            await this.driverLocator.findOnlineDriver(committedDriverId)
          ).isSome()
        : false;
      const outcome = ride.startBooking(isOnline, new Date());
      // The database and this server disagree on the time: next minute.
      if (outcome.isErr()) return undefined;
      await this.rideRepo.save(ride);
      return { ride, outcome: outcome.unwrap(), committedDriverId };
    });
  }

  // Saved and published first: the passenger's app opens the ride from
  // rides/<id>, whatever the search becomes.
  private async announceStart({
    ride,
    outcome,
    committedDriverId,
  }: StartedBooking): Promise<void> {
    switch (outcome) {
      case BookingStart.assigned:
        // No immediate ride for them anymore: hidden from the free taxis.
        if (committedDriverId) {
          await this.realtime.markDriverBusy(committedDriverId);
          await this.notifier.leaveBy(ride, committedDriverId);
        }
        return;
      case BookingStart.searching:
        await this.publisher.publishRide(ride);
        await this.notifier.bookingStarted(ride);
        break;
      case BookingStart.committedDriverRemoved:
        await this.publisher.publishRide(ride);
        await this.notifier.committedDriverUnavailable(ride);
        if (committedDriverId) {
          await this.notifier.bookingReassigned(ride, committedDriverId);
        }
        break;
    }
    await this.dispatcher.offerToNextDriver(ride);
  }

  private async takeBackBookingsNotLeft(): Promise<void> {
    for (;;) {
      const takenBack = await this.takeBackNextBookingNotLeft();
      if (!takenBack) return;
      const { ride, driverId } = takenBack;
      // Free again for other rides; another taxi is searched without them.
      await this.realtime.markDriverAvailable(driverId);
      await this.publisher.publishRide(ride);
      await this.notifier.committedDriverUnavailable(ride);
      await this.notifier.bookingReassigned(ride, driverId);
      await this.dispatcher.offerToNextDriver(ride);
    }
  }

  // One booking per transaction, as at the deadline: "Je pars" waits for the
  // lock, and is then refused.
  private async takeBackNextBookingNotLeft(): Promise<
    TakenBackBooking | undefined
  > {
    return this.rideRepo.transaction(async () => {
      const found = await this.rideRepo.lockNextBookingNotLeft(
        RideEntity.bookingDepartureDeadlineMinutes,
      );
      if (found.isNone()) return undefined;
      const ride = found.unwrap();
      const driverId = ride.scheduledDriverId;
      // The database and this server disagree on the time: next minute.
      if (!driverId || ride.removeDriverNotLeft(new Date()).isErr()) {
        return undefined;
      }
      await this.rideRepo.save(ride);
      return { ride, driverId };
    });
  }
}
