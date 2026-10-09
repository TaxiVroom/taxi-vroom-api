import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import { RideEntity } from '@modules/ride/domain/ride.entity';
import {
  BoardingCodeLockedError,
  RideNotAssignedToDriverError,
  RideNotFoundError,
  RideWrongStepError,
  WrongBoardingCodeError,
} from '@modules/ride/domain/ride.errors';
import { RideRepositoryPort } from '@modules/ride/database/ride.repository.port';
import { RIDE_REPOSITORY } from '@modules/ride/ride.di-tokens';
import { RidePublisher } from '@modules/ride/application/ride-publisher';
import { StartRideCommand } from './start-ride.command';

export type StartRideError =
  | RideNotFoundError
  | RideNotAssignedToDriverError
  | RideWrongStepError
  | WrongBoardingCodeError
  | BoardingCodeLockedError;

@CommandHandler(StartRideCommand)
export class StartRideService implements ICommandHandler {
  constructor(
    @Inject(RIDE_REPOSITORY) private readonly rideRepo: RideRepositoryPort,
    private readonly publisher: RidePublisher,
  ) {}

  async execute(
    command: StartRideCommand,
  ): Promise<Result<void, StartRideError>> {
    const result = await this.rideRepo.transaction(() => this.start(command));
    if (result.isErr()) return Err(result.unwrapErr());

    // The passenger sees the ride started.
    await this.publisher.publishRide(result.unwrap());
    return Ok(undefined);
  }

  private async start(
    command: StartRideCommand,
  ): Promise<Result<RideEntity, StartRideError>> {
    const found = await this.rideRepo.findOneById(command.rideId);
    if (found.isNone()) return Err(new RideNotFoundError());

    const ride = found.unwrap();
    const started = ride.start(
      command.driverId,
      command.boardingCode,
      new Date(),
    );
    // Saved even when refused: a wrong code counts towards the limit.
    await this.rideRepo.save(ride);
    return started.isOk() ? Ok(ride) : Err(started.unwrapErr());
  }
}
