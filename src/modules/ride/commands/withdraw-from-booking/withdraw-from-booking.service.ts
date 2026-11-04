import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import { RideEntity } from '@modules/ride/domain/ride.entity';
import {
  RideNotAssignedToDriverError,
  RideNotFoundError,
  RideWrongStepError,
} from '@modules/ride/domain/ride.errors';
import { RideRepositoryPort } from '@modules/ride/database/ride.repository.port';
import { RIDE_REPOSITORY } from '@modules/ride/ride.di-tokens';
import { RideNotifier } from '@modules/ride/application/ride-notifier';
import { WithdrawFromBookingCommand } from './withdraw-from-booking.command';

export type WithdrawFromBookingError =
  | RideNotFoundError
  | RideNotAssignedToDriverError
  | RideWrongStepError;

@CommandHandler(WithdrawFromBookingCommand)
export class WithdrawFromBookingService implements ICommandHandler {
  constructor(
    @Inject(RIDE_REPOSITORY) private readonly rideRepo: RideRepositoryPort,
    private readonly notifier: RideNotifier,
  ) {}

  async execute(
    command: WithdrawFromBookingCommand,
  ): Promise<Result<void, WithdrawFromBookingError>> {
    const result = await this.rideRepo.transaction(() =>
      this.withdraw(command),
    );
    if (result.isErr()) return Err(result.unwrapErr());
    // The booking is open to the other drivers again.
    await this.notifier.bookingDriverWithdrew(result.unwrap());
    return Ok(undefined);
  }

  private async withdraw(
    command: WithdrawFromBookingCommand,
  ): Promise<Result<RideEntity, WithdrawFromBookingError>> {
    const found = await this.rideRepo.findOneById(command.rideId);
    if (found.isNone()) return Err(new RideNotFoundError());
    const ride = found.unwrap();

    const withdrawn = ride.withdrawFromBooking(command.driverId, new Date());
    if (withdrawn.isErr()) return Err(withdrawn.unwrapErr());
    await this.rideRepo.save(ride);
    return Ok(ride);
  }
}
