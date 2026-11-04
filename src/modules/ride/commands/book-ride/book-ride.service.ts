import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import {
  RideEstimateExpiredError,
  RideNotFoundError,
  RideNotOwnedByPassengerError,
  RidePickupTimeNotBookableError,
  RideWrongStepError,
} from '@modules/ride/domain/ride.errors';
import { RideRepositoryPort } from '@modules/ride/database/ride.repository.port';
import { RIDE_REPOSITORY } from '@modules/ride/ride.di-tokens';
import { BookRideCommand } from './book-ride.command';

export type BookRideError =
  | RideNotFoundError
  | RideNotOwnedByPassengerError
  | RideWrongStepError
  | RideEstimateExpiredError
  | RidePickupTimeNotBookableError;

// Nobody is told yet: drivers find the booking in their "Réservations" tab,
// and it starts 30 min before its pickup.
@CommandHandler(BookRideCommand)
export class BookRideService implements ICommandHandler {
  constructor(
    @Inject(RIDE_REPOSITORY) private readonly rideRepo: RideRepositoryPort,
  ) {}

  async execute(
    command: BookRideCommand,
  ): Promise<Result<void, BookRideError>> {
    return this.rideRepo.transaction(async () => {
      const found = await this.rideRepo.findOneById(command.rideId);
      if (found.isNone()) return Err(new RideNotFoundError());
      const ride = found.unwrap();

      const booked = ride.book(command.passengerId, new Date());
      if (booked.isErr()) return Err(booked.unwrapErr());
      await this.rideRepo.save(ride);
      return Ok(undefined);
    });
  }
}
