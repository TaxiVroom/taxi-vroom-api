import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { None, Option, Some } from 'oxide.ts';
import { PrismaRepositoryBase } from '@libs/db/prisma-repository.base';
import { PrismaService } from '@libs/db/prisma.service';
import { PrismaErrorCode } from '@libs/db/prisma-error.codes';
import { ConflictException } from '@libs/exceptions';
import { RideMapper, RideOfferModel, RideRecord } from '../ride.mapper';
import { RideEntity } from '../domain/ride.entity';
import { RideOfferStatus, RideStatus } from '../domain/ride.types';
import {
  RideParticipants,
  RidePerson,
  RideRepositoryPort,
} from './ride.repository.port';

// The statuses where the driver is busy with the ride.
const activeRideStatuses = [
  RideStatus.driverEnRoute,
  RideStatus.driverArrived,
  RideStatus.inProgress,
];

const withSubTables = {
  offers: { include: { acceptance: true, decline: true, expiration: true } },
  noDriverFound: true,
  boardingCode: true,
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

  async findOneByIdForUpdate(id: string): Promise<Option<RideEntity>> {
    await this.client
      .$queryRaw`SELECT id FROM rides WHERE id = ${id} FOR UPDATE`;
    return this.findOneById(id);
  }

  async save(ride: RideEntity): Promise<void> {
    ride.validate();
    const { offers, noDriverFound, boardingCode, ...row } =
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
      if (boardingCode) {
        await this.client.rideBoardingCode.upsert({
          where: { rideId: row.id },
          create: { rideId: row.id, ...boardingCode },
          update: boardingCode,
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
          select: { driver: { select: { user: { select: personFields } } } },
        },
      },
    });
    const driver: RidePerson | undefined = ride.offers[0]?.driver.user;
    return { passenger: ride.passenger.user, driver: driver ?? null };
  }

  private async saveOffer(offer: RideOfferModel): Promise<void> {
    const { acceptance, decline, expiration, ...row } = offer;
    await this.client.rideOffer.upsert({
      where: { id: row.id },
      create: row,
      update: { status: row.status },
    });
    if (acceptance) {
      await this.client.rideOfferAcceptance.upsert({
        where: { offerId: row.id },
        create: { offerId: row.id, ...acceptance },
        update: acceptance,
      });
    }
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
}
