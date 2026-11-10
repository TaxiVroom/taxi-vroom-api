import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';
import { None, Option, Some } from 'oxide.ts';
import { PrismaRepositoryBase } from '@libs/db/prisma-repository.base';
import { PrismaService } from '@libs/db/prisma.service';
import { DriverDocumentSubmissionEntity } from '../domain/driver-document-submission.entity';
import { DriverDocumentTypeRules } from '../domain/driver-document-submission.types';
import {
  DriverDocumentSubmissionMapper,
  DriverDocumentSubmissionModel,
} from '../driver-document-submission.mapper';
import { DriverDocumentSubmissionRepositoryPort } from './driver-document-submission.repository.port';

@Injectable()
export class DriverDocumentSubmissionRepository
  extends PrismaRepositoryBase<
    DriverDocumentSubmissionEntity,
    DriverDocumentSubmissionModel
  >
  implements DriverDocumentSubmissionRepositoryPort
{
  protected modelName = 'driverDocumentSubmission';

  constructor(
    prisma: PrismaService,
    mapper: DriverDocumentSubmissionMapper,
    eventEmitter: EventEmitter2,
  ) {
    super(
      prisma,
      mapper,
      eventEmitter,
      new Logger(DriverDocumentSubmissionRepository.name),
    );
  }

  async findType(
    documentTypeId: string,
  ): Promise<Option<DriverDocumentTypeRules>> {
    const type = await this.client.documentType.findUnique({
      where: { id: documentTypeId },
      select: { id: true, name: true, backRequired: true, expires: true },
    });
    return type ? Some(type) : None;
  }

  async upsert(submission: DriverDocumentSubmissionEntity): Promise<void> {
    const { id, createdAt, ...row } = this.mapper.toPersistence(submission);
    await this.model.upsert({
      where: {
        driverId_documentTypeId: {
          driverId: row.driverId,
          documentTypeId: row.documentTypeId,
        },
      },
      create: { id, createdAt, ...row },
      update: { ...row, createdAt },
    });
    await submission.publishEvents(this.logger, this.eventEmitter);
  }

  async replaceDocument(
    submission: DriverDocumentSubmissionEntity,
  ): Promise<void> {
    const { driverId, documentTypeId, frontFilePath, backFilePath, expiresAt } =
      this.mapper.toPersistence(submission);
    const document = { frontFilePath, backFilePath, expiresAt };
    await this.client.document.upsert({
      where: { driverId_documentTypeId: { driverId, documentTypeId } },
      create: { id: randomUUID(), driverId, documentTypeId, ...document },
      update: document,
    });
    await this.model.delete({ where: { id: submission.id } });
    await submission.publishEvents(this.logger, this.eventEmitter);
  }
}
