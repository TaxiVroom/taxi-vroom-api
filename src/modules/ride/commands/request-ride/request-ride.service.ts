import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Ok, Result } from 'oxide.ts';
import { AggregateID } from '@libs/ddd';
import { RideEntity } from '@modules/ride/domain/ride.entity';
import { RideRepositoryPort } from '@modules/ride/database/ride.repository.port';
import { RIDE_REPOSITORY } from '@modules/ride/ride.di-tokens';
import { RideDispatcher } from '@modules/ride/application/ride-dispatcher';
import { RidePublisher } from '@modules/ride/application/ride-publisher';
import { RequestRideCommand } from './request-ride.command';

@CommandHandler(RequestRideCommand)
export class RequestRideService implements ICommandHandler {
  constructor(
    @Inject(RIDE_REPOSITORY) private readonly rideRepo: RideRepositoryPort,
    private readonly publisher: RidePublisher,
    private readonly dispatcher: RideDispatcher,
  ) {}

  async execute(
    command: RequestRideCommand,
  ): Promise<Result<AggregateID, never>> {
    const ride = RideEntity.request({
      passengerId: command.passengerId,
      origin: command.origin,
      destination: command.destination,
      estimatedPrice: command.estimatedPrice,
    });
    await this.rideRepo.transaction(async () => this.rideRepo.save(ride));

    // The passenger sees the search start, then the closest driver gets it.
    await this.publisher.publishRide(ride);
    await this.dispatcher.offerToNextDriver(ride);
    return Ok(ride.id);
  }
}
