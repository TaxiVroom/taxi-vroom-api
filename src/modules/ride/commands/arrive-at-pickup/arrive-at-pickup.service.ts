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
import { RidePublisher } from '@modules/ride/application/ride-publisher';
import { ArriveAtPickupCommand } from './arrive-at-pickup.command';

type ArriveError =
  | RideNotFoundError
  | RideNotAssignedToDriverError
  | RideWrongStepError;

@CommandHandler(ArriveAtPickupCommand)
export class ArriveAtPickupService implements ICommandHandler {
  constructor(
    @Inject(RIDE_REPOSITORY) private readonly rideRepo: RideRepositoryPort,
    private readonly publisher: RidePublisher,
    private readonly notifier: RideNotifier,
  ) {}

  async execute(
    command: ArriveAtPickupCommand,
  ): Promise<Result<void, ArriveError>> {
    const result = await this.rideRepo.transaction(() => this.arrive(command));
    if (result.isErr()) return Err(result.unwrapErr());

    // The passenger sees their taxi arrived.
    const ride = result.unwrap();
    await this.publisher.publishRide(ride);
    await this.notifier.driverArrived(ride);
    return Ok(undefined);
  }

  private async arrive(
    command: ArriveAtPickupCommand,
  ): Promise<Result<RideEntity, ArriveError>> {
    const found = await this.rideRepo.findOneById(command.rideId);
    if (found.isNone()) return Err(new RideNotFoundError());

    const ride = found.unwrap();
    const arrived = ride.arrive(command.driverId, new Date());
    if (arrived.isErr()) return Err(arrived.unwrapErr());

    await this.rideRepo.save(ride);
    return Ok(ride);
  }
}
