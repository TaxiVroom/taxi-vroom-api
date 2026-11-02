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
    const { offers, noDriverFound, cancellation, ...row } =
      this.mapper.toPersistence(ride);
    try {
      await this.model.upsert({
        where: { id: row.id },
        create: row,
        update: row,
      });
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

  async findBusyDriverIds(driverIds: string[]): Promise<Set<string>> {
    const offers = await this.client.rideOffer.findMany({
      where: {
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
    return new Set(offers.map((offer: { driverId: string }) => offer.driverId));
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
