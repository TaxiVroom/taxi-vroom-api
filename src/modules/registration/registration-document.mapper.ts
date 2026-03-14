import { Injectable } from '@nestjs/common';
import { Mapper } from '@libs/ddd';
import { RegistrationDocumentEntity } from './domain/registration-document.entity';
import { RegistrationDocumentProps } from './domain/registration-document.types';
import { RegistrationDocumentResponseDto } from './dtos/registration-document.response.dto';

export type RegistrationDocumentModel = {
  id: string;
  driverRegId: string;
  documentTypeId: string;
  frontFilePath: string;
  backFilePath: string | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class RegistrationDocumentMapper
  implements
    Mapper<
      RegistrationDocumentEntity,
      RegistrationDocumentModel,
      RegistrationDocumentResponseDto
    >
{
  toPersistence(entity: RegistrationDocumentEntity): RegistrationDocumentModel {
    const props = entity.getProps();
    return {
      id: entity.id,
      driverRegId: props.driverRegId,
      documentTypeId: props.documentTypeId,
      frontFilePath: props.frontFilePath,
      backFilePath: props.backFilePath,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  toDomain(record: RegistrationDocumentModel): RegistrationDocumentEntity {
    return new RegistrationDocumentEntity({
      id: record.id,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      props: {
        driverRegId: record.driverRegId,
        documentTypeId: record.documentTypeId,
        frontFilePath: record.frontFilePath,
        backFilePath: record.backFilePath,
      } satisfies RegistrationDocumentProps,
    });
  }

  toResponse(
    entity: RegistrationDocumentEntity,
  ): RegistrationDocumentResponseDto {
    const props = entity.getProps();
    const response = new RegistrationDocumentResponseDto();
    response.id = entity.id;
    response.documentTypeId = props.documentTypeId;
    response.createdAt = entity.createdAt.toISOString();
    return response;
  }
}
