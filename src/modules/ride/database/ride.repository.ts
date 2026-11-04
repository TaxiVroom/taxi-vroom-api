import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { None, Option, Some } from 'oxide.ts';
import { PrismaRepositoryBase } from '@libs/db/prisma-repository.base';
import { PrismaService } from '@libs/db/prisma.service';
import { PrismaErrorCode } from '@libs/db/prisma-error.codes';
import { ConflictException } from '@libs/exceptions';
import {
  RideAcceptanceModel,
  RideArrivalModel,
  RideCompletionModel,
  RideMapper,
  RideOfferModel,
  RideRecord,
  RideScheduleModel,
} from '../ride.mapper';
import { RideEntity } from '../domain/ride.entity';
import {
  HolidayZone,
  RideCompletion,
  RideOfferStatus,
  RideRating,
  RideStatus,
  TaxiTariff,
} from '../domain/ride.types';
import {
  RideDriverStats,
  RideParticipants,
  RideRepositoryPort,
} from './ride.repository.port';

// The statuses where the driver is busy with the ride.
const activeRideStatuses = [
  RideStatus.driverEnRoute,
  RideStatus.driverArrived,
  RideStatus.inProgress,
];

const withSubTables = {
  offers: {
    include: {
      acceptance: {
        include: {
          boardingCode: true,
          arrival: {
            include: {
              start: {
                include: {
                  completion: { include: { supplements: true, rating: true } },
                },
              },
              noShow: true,
            },
          },
          withdrawal: true,
        },
      },
      decline: true,
      expiration: true,
    },
  },
  noDriverFound: true,
  cancellation: true,
  schedule: {
    include: { driver: true, withdrawals: true, refusals: true, alerts: true },
  },
};

const personFields = { firstName: true, lastName: true, phone: true };

@Injectable()
export class RideRepository
  extends PrismaRepositoryBase<RideEntity, RideRecord>
  implements RideRepositoryPort
{
  protected modelName = 'ride';

  constructor(
    prisma: PrismaService,
    mapper: RideMapper,
    eventEmitter: EventEmitter2,
  ) {
    super(prisma, mapper, eventEmitter, new Logger(RideRepository.name));
  }

  async findOneById(id: string): Promise<Option<RideEntity>> {
    const record = await this.model.findUnique({
      where: { id },
      include: withSubTables,
    });
    return record ? Some(this.mapper.toDomain(record)) : None;
  }

  async save(ride: RideEntity): Promise<void> {
    ride.validate();
    const { offers, noDriverFound, cancellation, schedule, ...row } =
      this.mapper.toPersistence(ride);
    try {
      await this.model.upsert({
        where: { id: row.id },
        create: row,
        update: row,
      });
      if (schedule) await this.saveSchedule(row.id, schedule);
      // In the order they were made: an answered offer is saved before the
      // next pending one, as one pending offer at most is allowed.
      for (const offer of offers) await this.saveOffer(offer);
      if (noDriverFound) {
        await this.client.rideNoDriverFound.upsert({
          where: { rideId: row.id },
          create: { rideId: row.id, ...noDriverFound },
          update: noDriverFound,
        });
      }
      if (cancellation) {
        await this.client.rideCancellation.upsert({
          where: { rideId: row.id },
          create: { rideId: row.id, ...cancellation },
          update: cancellation,
        });
      }
    } catch (error: any) {
      if (error.code === PrismaErrorCode.UniqueConstraintViolation) {
        throw new ConflictException('Ride refused by a constraint', error);
      }
      throw error;
    }
    await ride.publishEvents(this.logger, this.eventEmitter);
  }

  async findBusyDriverIds(
    driverIds: string[],
    exceptRideId?: string,
  ): Promise<Set<string>> {
    const otherRide = exceptRideId ? { rideId: { not: exceptRideId } } : {};
    const offers = await this.client.rideOffer.findMany({
      where: {
        ...otherRide,
        driverId: { in: driverIds },
        OR: [
          { status: RideOfferStatus.pending },
          {
            status: RideOfferStatus.accepted,
            ride: { status: { in: activeRideStatuses } },
          },
        ],
      },
      select: { driverId: true },
    });
    // Waiting to leave for their booking: no other ride meanwhile.
    const assigned = await this.client.rideScheduleDriver.findMany({
      where: {
        ...otherRide,
        driverId: { in: driverIds },
        schedule: { ride: { status: RideStatus.driverAssigned } },
      },
      select: { driverId: true },
    });
    return new Set(
      [...offers, ...assigned].map((row: { driverId: string }) => row.driverId),
    );
  }

  async findCommittedPickupTimes(
    driverId: string,
    exceptRideId: string,
  ): Promise<Date[]> {
    const schedules = await this.client.rideSchedule.findMany({
      where: {
        rideId: { not: exceptRideId },
        driver: { driverId },
        ride: {
          status: { in: [RideStatus.booked, RideStatus.driverAssigned] },
        },
      },
      select: { pickupAt: true },
    });
    return schedules.map((s: { pickupAt: Date }) => s.pickupAt);
  }

  // Raw SQL: Prisma cannot lock rows. Locked until the transaction ends, and
  // skipped by another server running the same task.
  // https://www.postgresql.org/docs/current/sql-select.html
  async lockNextDueBooking(leadMinutes: number): Promise<Option<RideEntity>> {
    const rows: { id: string }[] = await this.client.$queryRaw`
      SELECT r.id
      FROM rides r
      JOIN ride_schedules s ON s."rideId" = r.id
      WHERE r.status = 'BOOKED'
        AND s."pickupAt" <= (now() AT TIME ZONE 'UTC') + make_interval(mins => ${leadMinutes}::int)
      ORDER BY s."pickupAt"
      LIMIT 1
      FOR UPDATE OF r SKIP LOCKED`;
    return rows.length > 0 ? this.findOneById(rows[0].id) : None;
  }

  // Same lock, for the booking whose committed driver was not reminded yet.
  async lockNextBookingToRemind(
    leadMinutes: number,
  ): Promise<Option<RideEntity>> {
    const rows: { id: string }[] = await this.client.$queryRaw`
      SELECT r.id
      FROM rides r
      JOIN ride_schedules s ON s."rideId" = r.id
      JOIN ride_schedule_drivers d ON d."rideId" = r.id
      WHERE r.status = 'BOOKED'
        AND s."pickupAt" <= (now() AT TIME ZONE 'UTC') + make_interval(mins => ${leadMinutes}::int)
        AND NOT EXISTS (
          SELECT 1 FROM ride_schedule_alerts a
          WHERE a."rideId" = r.id AND a."driverId" = d."driverId" AND a.kind = 'GO_ONLINE'
        )
      ORDER BY s."pickupAt"
      LIMIT 1
      FOR UPDATE OF r SKIP LOCKED`;
    return rows.length > 0 ? this.findOneById(rows[0].id) : None;
  }

  // Same lock, for the next booking still assigned leadMinutes or less before
  // its pickup: its driver did not leave in time.
  async lockNextBookingNotLeft(
    leadMinutes: number,
  ): Promise<Option<RideEntity>> {
    const rows: { id: string }[] = await this.client.$queryRaw`
      SELECT r.id
      FROM rides r
      JOIN ride_schedules s ON s."rideId" = r.id
      WHERE r.status = 'DRIVER_ASSIGNED'
        AND s."pickupAt" <= (now() AT TIME ZONE 'UTC') + make_interval(mins => ${leadMinutes}::int)
      ORDER BY s."pickupAt"
      LIMIT 1
      FOR UPDATE OF r SKIP LOCKED`;
    return rows.length > 0 ? this.findOneById(rows[0].id) : None;
  }

  // Waits for the lock: "Je pars" and the task of each minute change the
  // same booking one after the other.
  async lockOneById(id: string): Promise<Option<RideEntity>> {
    const rows: { id: string }[] = await this.client.$queryRaw`
      SELECT id FROM rides WHERE id = ${id} FOR UPDATE`;
    return rows.length > 0 ? this.findOneById(id) : None;
  }

  async findParticipants(rideId: string): Promise<RideParticipants> {
    const ride = await this.model.findUniqueOrThrow({
      where: { id: rideId },
      select: {
        passenger: { select: { user: { select: personFields } } },
        offers: {
          where: { status: RideOfferStatus.accepted },
          select: {
            driverId: true,
            driver: { select: { user: { select: personFields } } },
          },
        },
      },
    });
    const offer = ride.offers[0];
    return {
      passenger: ride.passenger.user,
      driver: offer
        ? { ...offer.driver.user, ...(await this.driverStats(offer.driverId)) }
        : null,
    };
  }

  // Asked each time, not stored: a driver's stats only move between rides,
  // and a stored copy could go wrong.
  private async driverStats(driverId: string): Promise<RideDriverStats> {
    const completion = {
      start: { arrival: { acceptance: { offer: { driverId } } } },
    };
    const [ratings, completedRides] = await Promise.all([
      this.client.rideRating.aggregate({
        where: { completion },
        _avg: { stars: true },
      }),
      this.client.rideCompletion.count({ where: completion }),
    ]);
    return { rating: ratings._avg.stars, completedRides };
  }

  async findTariff(
    departmentCode: string,
    at: Date,
  ): Promise<Option<TaxiTariff>> {
    const row = await this.client.taxiTariff.findFirst({
      where: { departmentCode, validFrom: { lte: at } },
      orderBy: { validFrom: 'desc' },
    });
    if (!row) return None;
    return Some({
      id: row.id,
      departmentCode: row.departmentCode,
      validFrom: row.validFrom,
      decree: row.decree,
      pickupCents: row.pickupCents,
      kmCents: {
        a: row.kmCentsA,
        b: row.kmCentsB,
        c: row.kmCentsC,
        d: row.kmCentsD,
      },
      hourlyCents: row.hourlyCents,
      minimumFareCents: row.minimumFareCents,
      nightStartMinute: row.nightStartMinute,
      nightEndMinute: row.nightEndMinute,
      holidayZone: row.holidayZone as HolidayZone,
    });
  }

  // The committed driver is written once, or removed; a withdrawal is written
  // once.
  private async saveSchedule(
    rideId: string,
    {
      pickupAt,
      tripMeters,
      driver,
      withdrawals,
      refusals,
      alerts,
    }: RideScheduleModel,
  ): Promise<void> {
    await this.client.rideSchedule.upsert({
      where: { rideId },
      create: { rideId, pickupAt, tripMeters },
      update: {},
    });
    // One query each: the rows already saved are skipped, a refusal or a
    // withdrawal never changes.
    // https://www.prisma.io/docs/orm/v7/reference/prisma-client-reference
    await this.client.rideScheduleRefusal.createMany({
      data: refusals.map((refusal) => ({ rideId, ...refusal })),
      skipDuplicates: true,
    });
    await this.client.rideScheduleWithdrawal.createMany({
      data: withdrawals.map((withdrawal) => ({ rideId, ...withdrawal })),
      skipDuplicates: true,
    });
    await this.client.rideScheduleAlert.createMany({
      data: alerts.map((alert) => ({ rideId, ...alert })),
      skipDuplicates: true,
    });
    if (driver) {
      const saved = await this.client.rideScheduleDriver.findUnique({
        where: { rideId },
      });
      // Create, not upsert: when two drivers accept at once, the key lets
      // one through and the other gets a ConflictException.
      if (!saved) {
        await this.client.rideScheduleDriver.create({
          data: { rideId, ...driver },
        });
      }
    } else {
      await this.client.rideScheduleDriver.deleteMany({ where: { rideId } });
    }
  }

  private async saveOffer(offer: RideOfferModel): Promise<void> {
    const { acceptance, decline, expiration, ...row } = offer;
    await this.client.rideOffer.upsert({
      where: { id: row.id },
      create: row,
      update: { status: row.status },
    });
    if (acceptance) await this.saveAcceptance(row.id, acceptance);
    if (decline) {
      await this.client.rideOfferDecline.upsert({
        where: { offerId: row.id },
        create: { offerId: row.id, ...decline },
        update: decline,
      });
    }
    if (expiration) {
      await this.client.rideOfferExpiration.upsert({
        where: { offerId: row.id },
        create: { offerId: row.id, ...expiration },
        update: expiration,
      });
    }
  }

  // Each step after the one it depends on: acceptance, then boarding code,
  // arrival or withdrawal, then start or no-show, then completion.
  private async saveAcceptance(
    offerId: string,
    { acceptedAt, boardingCode, arrival, withdrawal }: RideAcceptanceModel,
  ): Promise<void> {
    await this.client.rideOfferAcceptance.upsert({
      where: { offerId },
      create: { offerId, acceptedAt },
      update: { acceptedAt },
    });
    if (boardingCode) {
      await this.client.rideBoardingCode.upsert({
        where: { offerId },
        create: { offerId, ...boardingCode },
        update: boardingCode,
      });
    } else {
      // Not needed anymore once the ride started.
      await this.client.rideBoardingCode.deleteMany({ where: { offerId } });
    }
    if (arrival) await this.saveArrival(offerId, arrival);
    if (withdrawal) {
      await this.client.rideOfferWithdrawal.upsert({
        where: { offerId },
        create: { offerId, ...withdrawal },
        update: withdrawal,
      });
    }
  }

  private async saveArrival(
    offerId: string,
    { arrivedAt, start, noShow }: RideArrivalModel,
  ): Promise<void> {
    await this.client.rideArrival.upsert({
      where: { offerId },
      create: { offerId, arrivedAt },
      update: { arrivedAt },
    });
    if (start) {
      const { startedAt, completion } = start;
      await this.client.rideStart.upsert({
        where: { offerId },
        create: { offerId, startedAt },
        update: { startedAt },
      });
      if (completion) await this.saveCompletion(offerId, completion);
    }
    if (noShow) {
      await this.client.rideNoShow.upsert({
        where: { offerId },
        create: { offerId, ...noShow },
        update: noShow,
      });
    }
  }

  private async saveCompletion(
    offerId: string,
    { completedAt, meterCents, supplements, rating }: RideCompletionModel,
  ): Promise<void> {
    await this.createCompletionOnce(offerId, {
      completedAt,
      meterCents,
      supplements,
    });
    if (rating) await this.createRatingOnce(offerId, rating);
  }

  // A completed ride does not change anymore.
  private async createCompletionOnce(
    offerId: string,
    { completedAt, meterCents, supplements }: RideCompletion,
  ): Promise<void> {
    const saved = await this.client.rideCompletion.findUnique({
      where: { offerId },
    });
    if (saved) return;
    await this.client.rideCompletion.create({
      data: {
        offerId,
        completedAt,
        meterCents,
        supplements: {
          create: supplements.map((s) => ({
            supplementId: s.supplementId,
            label: s.label,
            unitPriceCents: s.unitPriceCents,
            quantity: s.quantity,
          })),
        },
      },
    });
  }

  // A rating is given once, and never changed.
  private async createRatingOnce(
    offerId: string,
    { stars, compliments, ratedAt }: RideRating,
  ): Promise<void> {
    await this.client.rideRating.upsert({
      where: { offerId },
      create: { offerId, stars, compliments, ratedAt },
      update: {},
    });
  }
}
