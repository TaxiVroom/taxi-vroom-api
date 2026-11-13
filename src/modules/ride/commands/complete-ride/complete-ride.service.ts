import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import { RideEntity } from '@modules/ride/domain/ride.entity';
import {
  RideInvalidPassengerSupplementError,
  RideNotAssignedToDriverError,
  RideNotFoundError,
  RideWrongStepError,
} from '@modules/ride/domain/ride.errors';
import { RideRepositoryPort } from '@modules/ride/database/ride.repository.port';
import { RIDE_REALTIME, RIDE_REPOSITORY } from '@modules/ride/ride.di-tokens';
import { RideRealtimePort } from '@modules/ride/application/ports/ride-realtime.port';
import { RidePublisher } from '@modules/ride/application/ride-publisher';
import { CompleteRideCommand } from './complete-ride.command';

export type CompleteRideError =
  | RideNotFoundError
  | RideNotAssignedToDriverError
  | RideWrongStepError
  | RideInvalidPassengerSupplementError;

@CommandHandler(CompleteRideCommand)
export class CompleteRideService implements ICommandHandler {
  constructor(
    @Inject(RIDE_REPOSITORY) private readonly rideRepo: RideRepositoryPort,
    @Inject(RIDE_REALTIME) private readonly realtime: RideRealtimePort,
    private readonly publisher: RidePublisher,
  ) {}

  async execute(
    command: CompleteRideCommand,
  ): Promise<Result<void, CompleteRideError>> {
    const result = await this.rideRepo.transaction(() =>
      this.complete(command),
    );
    if (result.isErr()) return Err(result.unwrapErr());

    // The passenger gets the receipt; the driver is free again.
    await this.publisher.publishRide(result.unwrap());
    await this.realtime.markDriverAvailable(command.driverId);
    return Ok(undefined);
  }

  private async complete(
    command: CompleteRideCommand,
  ): Promise<Result<RideEntity, CompleteRideError>> {
    const found = await this.rideRepo.findOneById(command.rideId);
    if (found.isNone()) return Err(new RideNotFoundError());

    const ride = found.unwrap();
    const completed = ride.complete(
      command.driverId,
      command.meterCents,
      command.supplements,
      await this.rideRepo.findExtraPassengerCents(ride.id),
      new Date(),
    );
    if (completed.isErr()) return Err(completed.unwrapErr());

    await this.rideRepo.save(ride);
    return Ok(ride);
  }
}
