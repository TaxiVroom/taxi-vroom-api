import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import { ConflictException } from '@libs/exceptions';
import { RideEntity } from '@modules/ride/domain/ride.entity';
import {
  RideBookingOverlapError,
  RideBookingTakenError,
  RideNotFoundError,
  RideWrongStepError,
} from '@modules/ride/domain/ride.errors';
import { RideRepositoryPort } from '@modules/ride/database/ride.repository.port';
import { RIDE_REPOSITORY } from '@modules/ride/ride.di-tokens';
import { RideNotifier } from '@modules/ride/application/ride-notifier';
import { AcceptBookingCommand } from './accept-booking.command';

export type AcceptBookingError =
  | RideNotFoundError
  | RideWrongStepError
  | RideBookingTakenError
  | RideBookingOverlapError;

@CommandHandler(AcceptBookingCommand)
export class AcceptBookingService implements ICommandHandler {
  constructor(
    @Inject(RIDE_REPOSITORY) private readonly rideRepo: RideRepositoryPort,
    private readonly notifier: RideNotifier,
  ) {}

  async execute(
    command: AcceptBookingCommand,
  ): Promise<Result<void, AcceptBookingError>> {
    let result: Result<RideEntity, AcceptBookingError>;
    try {
      result = await this.rideRepo.transaction(() => this.accept(command));
    } catch (error) {
      // Two drivers at once: the key of ride_schedule_drivers let the other
      // one through.
      if (error instanceof ConflictException) {
        return Err(new RideBookingTakenError(error));
      }
      throw error;
    }
    if (result.isErr()) return Err(result.unwrapErr());
    await this.notifier.bookingConfirmed(result.unwrap());
    return Ok(undefined);
  }

  private async accept(
    command: AcceptBookingCommand,
  ): Promise<Result<RideEntity, AcceptBookingError>> {
    const found = await this.rideRepo.findOneById(command.rideId);
    if (found.isNone()) return Err(new RideNotFoundError());
    const ride = found.unwrap();

    const otherPickupTimes = await this.rideRepo.findCommittedPickupTimes(
      command.driverId,
      ride.id,
    );
    const accepted = ride.acceptBooking(
      command.driverId,
      otherPickupTimes,
      new Date(),
    );
    if (accepted.isErr()) return Err(accepted.unwrapErr());
    await this.rideRepo.save(ride);
    return Ok(ride);
  }
}
