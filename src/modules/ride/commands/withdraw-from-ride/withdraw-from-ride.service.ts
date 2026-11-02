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
import { RIDE_REALTIME, RIDE_REPOSITORY } from '@modules/ride/ride.di-tokens';
import { RideRealtimePort } from '@modules/ride/application/ports/ride-realtime.port';
import { RideDispatcher } from '@modules/ride/application/ride-dispatcher';
import { RideNotifier } from '@modules/ride/application/ride-notifier';
import { RidePublisher } from '@modules/ride/application/ride-publisher';
import { WithdrawFromRideCommand } from './withdraw-from-ride.command';

export type WithdrawFromRideError =
  | RideNotFoundError
  | RideNotAssignedToDriverError
  | RideWrongStepError;

@CommandHandler(WithdrawFromRideCommand)
export class WithdrawFromRideService implements ICommandHandler {
  constructor(
    @Inject(RIDE_REPOSITORY) private readonly rideRepo: RideRepositoryPort,
    @Inject(RIDE_REALTIME) private readonly realtime: RideRealtimePort,
    private readonly publisher: RidePublisher,
    private readonly dispatcher: RideDispatcher,
    private readonly notifier: RideNotifier,
  ) {}

  async execute(
    command: WithdrawFromRideCommand,
  ): Promise<Result<void, WithdrawFromRideError>> {
    const result = await this.rideRepo.transaction(() =>
      this.withdraw(command),
    );
    if (result.isErr()) return Err(result.unwrapErr());

    const ride = result.unwrap();
    await this.realtime.markDriverAvailable(command.driverId);
    // The passenger sees a driver searched again.
    await this.publisher.publishRide(ride);
    await this.notifier.driverWithdrew(ride);
    await this.dispatcher.offerToNextDriver(ride);
    return Ok(undefined);
  }

  private async withdraw(
    command: WithdrawFromRideCommand,
  ): Promise<Result<RideEntity, WithdrawFromRideError>> {
    const found = await this.rideRepo.findOneById(command.rideId);
    if (found.isNone()) return Err(new RideNotFoundError());

    const ride = found.unwrap();
    const withdrawn = ride.withdraw(command.driverId, new Date());
    if (withdrawn.isErr()) return Err(withdrawn.unwrapErr());

    await this.rideRepo.save(ride);
    return Ok(ride);
  }
}
