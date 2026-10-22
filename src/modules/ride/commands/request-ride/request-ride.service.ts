import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import { RideEntity } from '@modules/ride/domain/ride.entity';
import {
  RideEstimateExpiredError,
  RideNotFoundError,
  RideNotOwnedByPassengerError,
  RideWrongStepError,
} from '@modules/ride/domain/ride.errors';
import { RideRepositoryPort } from '@modules/ride/database/ride.repository.port';
import { RIDE_REPOSITORY } from '@modules/ride/ride.di-tokens';
import { RideDispatcher } from '@modules/ride/application/ride-dispatcher';
import { RidePublisher } from '@modules/ride/application/ride-publisher';
import { RequestRideCommand } from './request-ride.command';

export type RequestRideError =
  | RideNotFoundError
  | RideNotOwnedByPassengerError
  | RideWrongStepError
  | RideEstimateExpiredError;

@CommandHandler(RequestRideCommand)
export class RequestRideService implements ICommandHandler {
  constructor(
    @Inject(RIDE_REPOSITORY) private readonly rideRepo: RideRepositoryPort,
    private readonly publisher: RidePublisher,
    private readonly dispatcher: RideDispatcher,
  ) {}

  async execute(
    command: RequestRideCommand,
  ): Promise<Result<void, RequestRideError>> {
    const result = await this.rideRepo.transaction(() => this.request(command));
    if (result.isErr()) return Err(result.unwrapErr());

    // The passenger sees the search start, then the closest driver gets it.
    const ride = result.unwrap();
    await this.publisher.publishRide(ride);
    await this.dispatcher.offerToNextDriver(ride);
    return Ok(undefined);
  }

  private async request(
    command: RequestRideCommand,
  ): Promise<Result<RideEntity, RequestRideError>> {
    const found = await this.rideRepo.findOneById(command.rideId);
    if (found.isNone()) return Err(new RideNotFoundError());

    const ride = found.unwrap();
    const requested = ride.request(command.passengerId, new Date());
    if (requested.isErr()) return Err(requested.unwrapErr());

    await this.rideRepo.save(ride);
    return Ok(ride);
  }
}
