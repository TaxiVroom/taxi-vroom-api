import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import { RideEntity } from '@modules/ride/domain/ride.entity';
import {
  NoShowTooEarlyError,
  RideNotAssignedToDriverError,
  RideNotFoundError,
  RideWrongStepError,
} from '@modules/ride/domain/ride.errors';
import { RideRepositoryPort } from '@modules/ride/database/ride.repository.port';
import { RIDE_REALTIME, RIDE_REPOSITORY } from '@modules/ride/ride.di-tokens';
import { RideRealtimePort } from '@modules/ride/application/ports/ride-realtime.port';
import { RidePublisher } from '@modules/ride/application/ride-publisher';
import { ReportNoShowCommand } from './report-no-show.command';

export type ReportNoShowError =
  | RideNotFoundError
  | RideNotAssignedToDriverError
  | RideWrongStepError
  | NoShowTooEarlyError;

@CommandHandler(ReportNoShowCommand)
export class ReportNoShowService implements ICommandHandler {
  constructor(
    @Inject(RIDE_REPOSITORY) private readonly rideRepo: RideRepositoryPort,
    @Inject(RIDE_REALTIME) private readonly realtime: RideRealtimePort,
    private readonly publisher: RidePublisher,
  ) {}

  async execute(
    command: ReportNoShowCommand,
  ): Promise<Result<void, ReportNoShowError>> {
    const result = await this.rideRepo.transaction(() => this.report(command));
    if (result.isErr()) return Err(result.unwrapErr());

    // The passenger is told; the driver is free again.
    await this.publisher.publishRide(result.unwrap());
    await this.realtime.markDriverAvailable(command.driverId);
    return Ok(undefined);
  }

  private async report(
    command: ReportNoShowCommand,
  ): Promise<Result<RideEntity, ReportNoShowError>> {
    const found = await this.rideRepo.findOneById(command.rideId);
    if (found.isNone()) return Err(new RideNotFoundError());

    const ride = found.unwrap();
    const reported = ride.reportNoShow(command.driverId, new Date());
    if (reported.isErr()) return Err(reported.unwrapErr());

    await this.rideRepo.save(ride);
    return Ok(ride);
  }
}
