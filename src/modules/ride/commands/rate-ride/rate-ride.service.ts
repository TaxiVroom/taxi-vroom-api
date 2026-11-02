import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import {
  RideAlreadyRatedError,
  RideNotFoundError,
  RideNotOwnedByPassengerError,
  RideWrongStepError,
} from '@modules/ride/domain/ride.errors';
import { RideRepositoryPort } from '@modules/ride/database/ride.repository.port';
import { RIDE_REPOSITORY } from '@modules/ride/ride.di-tokens';
import { RateRideCommand } from './rate-ride.command';

export type RateRideError =
  | RideNotFoundError
  | RideNotOwnedByPassengerError
  | RideWrongStepError
  | RideAlreadyRatedError;

@CommandHandler(RateRideCommand)
export class RateRideService implements ICommandHandler {
  constructor(
    @Inject(RIDE_REPOSITORY) private readonly rideRepo: RideRepositoryPort,
  ) {}

  async execute(
    command: RateRideCommand,
  ): Promise<Result<void, RateRideError>> {
    return this.rideRepo.transaction(() => this.rate(command));
  }

  private async rate(
    command: RateRideCommand,
  ): Promise<Result<void, RateRideError>> {
    const found = await this.rideRepo.findOneById(command.rideId);
    if (found.isNone()) return Err(new RideNotFoundError());

    const ride = found.unwrap();
    const rated = ride.rate(
      command.passengerId,
      command.stars,
      command.compliments,
      new Date(),
    );
    if (rated.isErr()) return Err(rated.unwrapErr());

    await this.rideRepo.save(ride);
    return Ok(undefined);
  }
}
