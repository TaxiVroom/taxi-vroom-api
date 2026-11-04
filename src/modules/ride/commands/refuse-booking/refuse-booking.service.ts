import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import {
  RideNotFoundError,
  RideWrongStepError,
} from '@modules/ride/domain/ride.errors';
import { RideRepositoryPort } from '@modules/ride/database/ride.repository.port';
import { RIDE_REPOSITORY } from '@modules/ride/ride.di-tokens';
import { RefuseBookingCommand } from './refuse-booking.command';

export type RefuseBookingError = RideNotFoundError | RideWrongStepError;

// Nobody is told: the booking only leaves this driver's list.
@CommandHandler(RefuseBookingCommand)
export class RefuseBookingService implements ICommandHandler {
  constructor(
    @Inject(RIDE_REPOSITORY) private readonly rideRepo: RideRepositoryPort,
  ) {}

  async execute(
    command: RefuseBookingCommand,
  ): Promise<Result<void, RefuseBookingError>> {
    return this.rideRepo.transaction(async () => {
      const found = await this.rideRepo.findOneById(command.rideId);
      if (found.isNone()) return Err(new RideNotFoundError());
      const ride = found.unwrap();

      const refused = ride.refuseBooking(command.driverId, new Date());
      if (refused.isErr()) return Err(refused.unwrapErr());
      await this.rideRepo.save(ride);
      return Ok(undefined);
    });
  }
}
