import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaRepositoryBase } from '@libs/db/prisma-repository.base';
import { PrismaService } from '@libs/db/prisma.service';
import { PassengerEntity } from '../domain/passenger.entity';
import { PassengerMapper } from '../passenger.mapper';
import { PassengerRepositoryPort } from './passenger.repository.port';

export type PassengerModel = {
  userId: string;
};

@Injectable()
export class PassengerRepository
  extends PrismaRepositoryBase<PassengerEntity, PassengerModel>
  implements PassengerRepositoryPort
{
  protected modelName = 'passenger';

  constructor(
    prisma: PrismaService,
    mapper: PassengerMapper,
    eventEmitter: EventEmitter2,
  ) {
    super(prisma, mapper, eventEmitter, new Logger(PassengerRepository.name));
  }

  // The Passenger table uses `userId` as its @id, not `id`.
  // We override insert() to use the correct field name.
  async insert(entity: PassengerEntity | PassengerEntity[]): Promise<void> {
    const entities = Array.isArray(entity) ? entity : [entity];
    entities.forEach((e) => e.validate());

    for (const passenger of entities) {
      await this.client.passenger.create({
        data: { userId: passenger.id },
      });
      await passenger.publishEvents(this.logger, this.eventEmitter);
    }
  }
}
