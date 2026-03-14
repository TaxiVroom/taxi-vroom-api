import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { None, Option, Some } from 'oxide.ts';
import { PrismaRepositoryBase } from '@libs/db/prisma-repository.base';
import { PrismaService } from '@libs/db/prisma.service';
import {
  RegistrationDocumentMapper,
  RegistrationDocumentModel,
} from '../registration-document.mapper';
import { RegistrationDocumentEntity } from '../domain/registration-document.entity';
import { RegistrationDocumentRepositoryPort } from './registration-document.repository.port';

@Injectable()
export class RegistrationDocumentRepository
  extends PrismaRepositoryBase<
    RegistrationDocumentEntity,
    RegistrationDocumentModel
  >
  implements RegistrationDocumentRepositoryPort
{
  protected modelName = 'registrationDocument';

  constructor(
    prisma: PrismaService,
    mapper: RegistrationDocumentMapper,
    eventEmitter: EventEmitter2,
  ) {
    super(
      prisma,
      mapper,
      eventEmitter,
      new Logger(RegistrationDocumentRepository.name),
    );
  }

  async upsert(entity: RegistrationDocumentEntity): Promise<void> {
    entity.validate();
    const props = entity.getProps();
    const record = this.mapper.toPersistence(entity);

    await this.model.upsert({
      where: {
        driverRegId_documentTypeId: {
          driverRegId: props.driverRegId,
          documentTypeId: props.documentTypeId,
        },
      },
      create: record,
      update: {
        frontFilePath: props.frontFilePath,
        backFilePath: props.backFilePath,
      },
    });
  }

  async findAllByDriverRegId(
    driverRegId: string,
  ): Promise<RegistrationDocumentEntity[]> {
    const records = await this.model.findMany({ where: { driverRegId } });
    return records.map((r: RegistrationDocumentModel) =>
      this.mapper.toDomain(r),
    );
  }

  async findOneByDriverRegIdAndDocumentTypeId(
    driverRegId: string,
    documentTypeId: string,
  ): Promise<Option<RegistrationDocumentEntity>> {
    const record = await this.model.findFirst({
      where: { driverRegId, documentTypeId },
    });
    return record ? Some(this.mapper.toDomain(record)) : None;
  }
}
