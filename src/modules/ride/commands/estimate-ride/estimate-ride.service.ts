import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Err, None, Ok, Option, Result } from 'oxide.ts';
import { RideEntity } from '@modules/ride/domain/ride.entity';
import {
  NoDriverAvailableError,
  RideAreaNotServedError,
} from '@modules/ride/domain/ride.errors';
import {
  DriverCandidate,
  RidePickup,
  TaxiTariff,
} from '@modules/ride/domain/ride.types';
import { isTariffOutdated } from '@modules/ride/domain/taxi-fare';
import { RideRepositoryPort } from '@modules/ride/database/ride.repository.port';
import {
  DRIVER_LOCATOR,
  PUBLIC_HOLIDAYS,
  RIDE_REPOSITORY,
  ROUTE_PLANNER,
  TERRITORY,
} from '@modules/ride/ride.di-tokens';
import { DriverLocatorPort } from '@modules/ride/application/ports/driver-locator.port';
import { PublicHolidaysPort } from '@modules/ride/application/ports/public-holidays.port';
import { RoutePlannerPort } from '@modules/ride/application/ports/route-planner.port';
import { TerritoryPort } from '@modules/ride/application/ports/territory.port';
import { EstimateRideCommand } from './estimate-ride.command';

export type EstimateRideError = RideAreaNotServedError | NoDriverAvailableError;

// The ride priced, with what the passenger is shown to decide.
export type RideEstimate = {
  ride: RideEntity;
  tariff: TaxiTariff;
  approachSeconds: number;
};

@CommandHandler(EstimateRideCommand)
export class EstimateRideService implements ICommandHandler {
  private readonly logger = new Logger(EstimateRideService.name);

  constructor(
    @Inject(RIDE_REPOSITORY) private readonly rideRepo: RideRepositoryPort,
    @Inject(TERRITORY) private readonly territory: TerritoryPort,
    @Inject(DRIVER_LOCATOR) private readonly driverLocator: DriverLocatorPort,
    @Inject(ROUTE_PLANNER) private readonly routePlanner: RoutePlannerPort,
    @Inject(PUBLIC_HOLIDAYS)
    private readonly publicHolidays: PublicHolidaysPort,
  ) {}

  async execute(
    command: EstimateRideCommand,
  ): Promise<Result<RideEstimate, EstimateRideError>> {
    const now = new Date();
    const found = await this.findTariff(command.origin, now);
    if (found.isNone()) return Err(new RideAreaNotServedError());

    const candidates = await this.findCandidates(command.origin);
    const driver = RideEntity.approachingDriver(command.origin, candidates);
    if (driver.isErr()) return Err(driver.unwrapErr());

    return Ok(
      await this.estimate(command, found.unwrap(), driver.unwrap(), now),
    );
  }

  private async estimate(
    command: EstimateRideCommand,
    tariff: TaxiTariff,
    driver: DriverCandidate,
    now: Date,
  ): Promise<RideEstimate> {
    const route = await this.routePlanner.planTaxiRoute(
      driver,
      command.origin,
      command.destination,
    );
    const ride = RideEntity.estimate({
      passengerId: command.passengerId,
      origin: command.origin,
      destination: command.destination,
      tariff,
      route,
      publicHolidays: await this.findPublicHolidays(tariff, now),
      now,
    });
    await this.rideRepo.transaction(async () => this.rideRepo.save(ride));
    this.warnIfOutdated(tariff, now);

    const approachSeconds = route.approach.reduce((s, x) => s + x.seconds, 0);
    return { ride, tariff, approachSeconds };
  }

  private async findTariff(
    pickup: RidePickup,
    now: Date,
  ): Promise<Option<TaxiTariff>> {
    const departmentCode = await this.territory.findDepartmentCode(
      pickup.latitude,
      pickup.longitude,
    );
    return departmentCode.isSome()
      ? this.rideRepo.findTariff(departmentCode.unwrap(), now)
      : None;
  }

  private async findCandidates(pickup: RidePickup): Promise<DriverCandidate[]> {
    const onlineDrivers = await this.driverLocator.findOnlineDriversAround(
      pickup.latitude,
      pickup.longitude,
      RideEntity.reachableRadiusMeters,
    );
    const busy = await this.rideRepo.findBusyDriverIds(
      onlineDrivers.map((driver) => driver.driverId),
    );
    return onlineDrivers.map((driver) => ({
      ...driver,
      isBusy: busy.has(driver.driverId),
    }));
  }

  // This year's and the next one's: a ride may end after New Year's Eve.
  private async findPublicHolidays(
    tariff: TaxiTariff,
    now: Date,
  ): Promise<Set<string>> {
    const year = now.getUTCFullYear();
    const years = await Promise.all(
      [year, year + 1].map((y) =>
        this.publicHolidays.findPublicHolidays(tariff.holidayZone, y),
      ),
    );
    return new Set(years.flatMap((days) => [...days]));
  }

  // The new arrêté was probably not entered yet.
  private warnIfOutdated(tariff: TaxiTariff, now: Date): void {
    if (!isTariffOutdated(tariff, now)) return;
    this.logger.warn(
      `Tariff of ${tariff.departmentCode} over a year old ` +
        `(${tariff.decree}): check the new arrêté`,
    );
  }
}
