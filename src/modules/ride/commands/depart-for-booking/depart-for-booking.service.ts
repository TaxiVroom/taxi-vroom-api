import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import { RideEntity } from '@modules/ride/domain/ride.entity';
import {
  RideDriverBusyError,
  RideNotAssignedToDriverError,
  RideNotFoundError,
  RideWrongStepError,
} from '@modules/ride/domain/ride.errors';
import { RideRepositoryPort } from '@modules/ride/database/ride.repository.port';
import { RIDE_REPOSITORY } from '@modules/ride/ride.di-tokens';
import { RideNotifier } from '@modules/ride/application/ride-notifier';
import { RidePublisher } from '@modules/ride/application/ride-publisher';
import { DepartForBookingCommand } from './depart-for-booking.command';

export type DepartForBookingError =
  | RideNotFoundError
  | RideNotAssignedToDriverError
  | RideWrongStepError
  | RideDriverBusyError;

// "Je pars": the committed driver leaves for the pickup, then the ride goes
// on as after an accepted offer. The driver is already hidden from the free
// taxis since the booking's deadline.
@CommandHandler(DepartForBookingCommand)
export class DepartForBookingService implements ICommandHandler {
  constructor(
    @Inject(RIDE_REPOSITORY) private readonly rideRepo: RideRepositoryPort,
    private readonly publisher: RidePublisher,
    private readonly notifier: RideNotifier,
  ) {}

  async execute(
    command: DepartForBookingCommand,
  ): Promise<Result<void, DepartForBookingError>> {
    const result = await this.rideRepo.transaction(() => this.depart(command));
    if (result.isErr()) return Err(result.unwrapErr());

    const ride = result.unwrap();
    await this.publisher.publishRide(ride);
    await this.notifier.driverComing(ride);
    return Ok(undefined);
  }

  // Locked: the task of each minute may be removing this driver right now.
  private async depart(
    command: DepartForBookingCommand,
  ): Promise<Result<RideEntity, DepartForBookingError>> {
    const found = await this.rideRepo.lockOneById(command.rideId);
    if (found.isNone()) return Err(new RideNotFoundError());
    const ride = found.unwrap();

    const busy = await this.rideRepo.findBusyDriverIds(
      [command.driverId],
      ride.id,
    );
    const departed = ride.departForBooking(
      command.driverId,
      busy.has(command.driverId),
      new Date(),
    );
    if (departed.isErr()) return Err(departed.unwrapErr());
    await this.rideRepo.save(ride);
    return Ok(ride);
  }
}
