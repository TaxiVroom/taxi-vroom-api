import { Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandHandler, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { EnvConfig } from '@config/env.validation';
import { Err, None, Ok, Option, Result } from 'oxide.ts';
import { RideEntity } from '@modules/ride/domain/ride.entity';
import {
  NoDriverAvailableError,
  RideAreaNotServedError,
  RidePickupTimeNotBookableError,
} from '@modules/ride/domain/ride.errors';
import {
  DriverCandidate,
  RidePosition,
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
import {
  DriverSeatsReadModel,
  GetDriverSeatsQuery,
} from '@modules/driver/queries/get-driver-seats/get-driver-seats.query-handler';
import { EstimateRideCommand } from './estimate-ride.command';

export type EstimateRideError =
  | RideAreaNotServedError
  | NoDriverAvailableError
  | RidePickupTimeNotBookableError;

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
    private readonly configService: ConfigService<EnvConfig, true>,
    private readonly queryBus: QueryBus,
  ) {}

  async execute(
    command: EstimateRideCommand,
  ): Promise<Result<RideEstimate, EstimateRideError>> {
    const now = new Date();
    const { pickupAt } = command;
    // A booking is priced with the arrêté in force on its day.
    const found = await this.findTariff(command.origin, pickupAt ?? now);
    if (found.isNone()) return Err(new RideAreaNotServedError());
    if (pickupAt) {
      return this.estimateBooked(command, found.unwrap(), pickupAt, now);
    }

    const candidates = await this.findCandidates(command.origin);
    const driver = RideEntity.approachingDriver(
      command.origin,
      command.passengerCount,
      candidates,
    );
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
      passengerCount: command.passengerCount,
      origin: {
        ...command.origin,
        name: command.originName ?? RideEntity.unnamedPickup,
      },
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

  // No free taxi needed: nobody has to be online the day before. The road
  // is timed for the pickup time.
  private async estimateBooked(
    command: EstimateRideCommand,
    tariff: TaxiTariff,
    pickupAt: Date,
    now: Date,
  ): Promise<Result<RideEstimate, RidePickupTimeNotBookableError>> {
    // Checked before calling Mapbox for nothing.
    if (!RideEntity.isBookable(pickupAt, now)) {
      return Err(new RidePickupTimeNotBookableError());
    }
    const trip = await this.routePlanner.planTrip(
      command.origin,
      command.destination,
      pickupAt,
    );
    const estimated = RideEntity.estimateBooked({
      passengerId: command.passengerId,
      passengerCount: command.passengerCount,
      origin: {
        ...command.origin,
        name: command.originName ?? RideEntity.unnamedPickup,
      },
      destination: command.destination,
      tariff,
      trip,
      pickupAt,
      publicHolidays: await this.findPublicHolidays(tariff, pickupAt),
      now,
    });
    if (estimated.isErr()) return Err(estimated.unwrapErr());
    const ride = estimated.unwrap();
    await this.rideRepo.transaction(async () => this.rideRepo.save(ride));
    this.warnIfOutdated(tariff, now);
    return Ok({ ride, tariff, approachSeconds: 0 });
  }

  // A position without tariffs, in France or abroad, takes the fallback
  // département's when one is set: the demo, never production. A failure of
  // the territory lookup throws instead, so it never prices a known
  // département at the fallback's tariffs.
  private async findTariff(
    pickup: RidePosition,
    now: Date,
  ): Promise<Option<TaxiTariff>> {
    const departmentCode = await this.territory.findDepartmentCode(
      pickup.latitude,
      pickup.longitude,
    );
    const tariff: Option<TaxiTariff> = departmentCode.isSome()
      ? await this.rideRepo.findTariff(departmentCode.unwrap(), now)
      : None;
    const fallback = this.configService.get('FALLBACK_TARIFF_DEPARTMENT');
    if (tariff.isSome() || !fallback) return tariff;
    return this.rideRepo.findTariff(fallback, now);
  }

  private async findCandidates(
    pickup: RidePosition,
  ): Promise<DriverCandidate[]> {
    const onlineDrivers = await this.driverLocator.findOnlineDriversAround(
      pickup.latitude,
      pickup.longitude,
      RideEntity.reachableRadiusMeters,
    );
    const driverIds = onlineDrivers.map((driver) => driver.driverId);
    const busy = await this.rideRepo.findBusyDriverIds(driverIds);
    // One read for all the drivers; none known for a driver without vehicle.
    const seats: DriverSeatsReadModel[] = await this.queryBus.execute(
      new GetDriverSeatsQuery({ driverIds }),
    );
    const seatsOf = new Map(
      seats.map((entry) => [entry.driverId, entry.passengerSeats]),
    );
    return onlineDrivers.map((driver) => ({
      ...driver,
      isBusy: busy.has(driver.driverId),
      passengerSeats: seatsOf.get(driver.driverId) ?? 0,
    }));
  }

  // The year of the ride and the next one: a ride may end after New Year's
  // Eve.
  private async findPublicHolidays(
    tariff: TaxiTariff,
    at: Date,
  ): Promise<Set<string>> {
    const year = at.getUTCFullYear();
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
