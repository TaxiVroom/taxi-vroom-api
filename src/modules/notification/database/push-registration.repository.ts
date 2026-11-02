import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { None, Option, Some } from 'oxide.ts';
import { PrismaRepositoryBase } from '@libs/db/prisma-repository.base';
import { PrismaService } from '@libs/db/prisma.service';
import { PushRegistrationEntity } from '../domain/push-registration.entity';
import { PushRegistrationMapper } from '../push-registration.mapper';
import { PushRegistrationRepositoryPort } from './push-registration.repository.port';

export type PushRegistrationModel = {
  userId: string;
  token: string;
};

@Injectable()
export class PushRegistrationRepository
  extends PrismaRepositoryBase<PushRegistrationEntity, PushRegistrationModel>
  implements PushRegistrationRepositoryPort
{
  protected modelName = 'pushRegistration';

  constructor(
    prisma: PrismaService,
    mapper: PushRegistrationMapper,
    eventEmitter: EventEmitter2,
  ) {
    super(
      prisma,
      mapper,
      eventEmitter,
      new Logger(PushRegistrationRepository.name),
    );
  }

  async save(registration: PushRegistrationEntity): Promise<void> {
    registration.validate();
    const { userId, token } = this.mapper.toPersistence(registration);
    await this.model.deleteMany({ where: { token, userId: { not: userId } } });
    await this.model.upsert({
      where: { userId },
      create: { userId, token },
      update: { token },
    });
  }

  async findTokenByUserId(userId: string): Promise<Option<string>> {
    const row = await this.model.findUnique({ where: { userId } });
    return row ? Some(row.token) : None;
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.model.deleteMany({ where: { userId } });
  }
}
