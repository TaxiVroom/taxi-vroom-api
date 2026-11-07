import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaRepositoryBase } from '@libs/db/prisma-repository.base';
import { PrismaService } from '@libs/db/prisma.service';
import { DriverEntity } from '../domain/driver.entity';
import { DriverDocument, DriverVehicle } from '../domain/driver.types';
import { DriverMapper } from '../driver.mapper';
import { DriverRepositoryPort } from './driver.repository.port';

export type DriverModel = {
  userId: string;
  // The row of driver_vehicles, without its key.
  vehicle: DriverVehicle | null;
  // The rows of documents, without the driver's key.
  documents: DriverDocument[];
};

@Injectable()
export class DriverRepository
  extends PrismaRepositoryBase<DriverEntity, DriverModel>
  implements DriverRepositoryPort
{
  protected modelName = 'driver';

  constructor(
    prisma: PrismaService,
    mapper: DriverMapper,
    eventEmitter: EventEmitter2,
  ) {
    super(prisma, mapper, eventEmitter, new Logger(DriverRepository.name));
  }

  // The Driver table uses `userId` as its @id, not `id`.
  // We override insert() to use the correct field name.
  async insert(entity: DriverEntity | DriverEntity[]): Promise<void> {
    const entities = Array.isArray(entity) ? entity : [entity];
    entities.forEach((e) => e.validate());

    for (const driver of entities) {
      const { vehicle, documents } = this.mapper.toPersistence(driver);
      // The driver, its vehicle and its documents in one create.
      await this.client.driver.create({
        data: {
          userId: driver.id,
          ...(vehicle && { vehicle: { create: vehicle } }),
          documents: { createMany: { data: documents } },
        },
      });
      await driver.publishEvents(this.logger, this.eventEmitter);
    }
  }
}
