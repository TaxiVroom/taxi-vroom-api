import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import { RideEntity } from '@modules/ride/domain/ride.entity';
import {
  RideNotFoundError,
  RideNotOwnedByPassengerError,
  RideWrongStepError,
} from '@modules/ride/domain/ride.errors';
import { PendingRideOffer } from '@modules/ride/domain/ride.types';
import { RideRepositoryPort } from '@modules/ride/database/ride.repository.port';
import { RIDE_REALTIME, RIDE_REPOSITORY } from '@modules/ride/ride.di-tokens';
import { RideRealtimePort } from '@modules/ride/application/ports/ride-realtime.port';
import { RideOfferTimer } from '@modules/ride/application/ride-offer-timer';
import { RidePublisher } from '@modules/ride/application/ride-publisher';
import { CancelRideCommand } from './cancel-ride.command';

export type CancelRideError =
  | RideNotFoundError
  | RideNotOwnedByPassengerError
  | RideWrongStepError;

// Who was involved when the passenger cancelled.
type Cancelled = {
  ride: RideEntity;
  pendingOffer: PendingRideOffer | undefined;
  driverId: string | undefined;
};

@CommandHandler(CancelRideCommand)
export class CancelRideService implements ICommandHandler {
  constructor(
    @Inject(RIDE_REPOSITORY) private readonly rideRepo: RideRepositoryPort,
    @Inject(RIDE_REALTIME) private readonly realtime: RideRealtimePort,
    private readonly publisher: RidePublisher,
    private readonly offerTimer: RideOfferTimer,
  ) {}

  async execute(
    command: CancelRideCommand,
  ): Promise<Result<void, CancelRideError>> {
    const result = await this.rideRepo.transaction(() => this.cancel(command));
    if (result.isErr()) return Err(result.unwrapErr());

    const { ride, pendingOffer, driverId } = result.unwrap();
    // The driver asked no longer has to answer.
    if (pendingOffer) {
      this.offerTimer.stop(pendingOffer.id);
      await this.realtime.withdrawOffer(pendingOffer.driverId);
    }
    // The driver who had the ride is free again.
    if (driverId) await this.realtime.markDriverAvailable(driverId);
    await this.publisher.publishRide(ride);
    return Ok(undefined);
  }

  private async cancel(
    command: CancelRideCommand,
  ): Promise<Result<Cancelled, CancelRideError>> {
    const found = await this.rideRepo.findOneById(command.rideId);
    if (found.isNone()) return Err(new RideNotFoundError());

    const ride = found.unwrap();
    const { pendingOffer, driverId } = ride;
    const cancelled = ride.cancel(command.passengerId, new Date());
    if (cancelled.isErr()) return Err(cancelled.unwrapErr());

    await this.rideRepo.save(ride);
    return Ok({ ride, pendingOffer, driverId });
  }
}
