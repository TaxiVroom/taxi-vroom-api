import { Injectable } from '@nestjs/common';
import { Mapper } from '@libs/ddd';
import { DriverDocumentSubmissionEntity } from './domain/driver-document-submission.entity';

// A type, not an interface: the repository base needs an object literal.
export type DriverDocumentSubmissionModel = {
  id: string;
  driverId: string;
  documentTypeId: string;
  frontFilePath: string;
  backFilePath: string | null;
  expiresAt: Date | null;
  createdAt: Date;
};

@Injectable()
export class DriverDocumentSubmissionMapper
  implements
    Mapper<DriverDocumentSubmissionEntity, DriverDocumentSubmissionModel>
{
  toPersistence(
    entity: DriverDocumentSubmissionEntity,
  ): DriverDocumentSubmissionModel {
    const props = entity.getProps();
    return {
      id: entity.id,
      driverId: props.driverId,
      documentTypeId: props.documentTypeId,
      frontFilePath: props.frontFilePath,
      backFilePath: props.backFilePath,
      expiresAt: props.expiresAt,
      createdAt: entity.createdAt,
    };
  }

  toDomain(
    record: DriverDocumentSubmissionModel,
  ): DriverDocumentSubmissionEntity {
    return new DriverDocumentSubmissionEntity({
      id: record.id,
      createdAt: record.createdAt,
      props: {
        driverId: record.driverId,
        documentTypeId: record.documentTypeId,
        frontFilePath: record.frontFilePath,
        backFilePath: record.backFilePath,
        expiresAt: record.expiresAt,
      },
    });
  }

  toResponse(): never {
    throw new Error('A document submission has no response');
  }
}
