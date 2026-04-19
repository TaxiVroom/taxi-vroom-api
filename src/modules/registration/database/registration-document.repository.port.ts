import { Option } from 'oxide.ts';
import { RepositoryPort } from '@libs/ddd';
import { RegistrationDocumentEntity } from '../domain/registration-document.entity';

export interface RegistrationDocumentRepositoryPort
  extends RepositoryPort<RegistrationDocumentEntity> {
  // Upsert: creates a new record or replaces the existing one for the same (driverRegId, documentTypeId).
  upsert(entity: RegistrationDocumentEntity): Promise<void>;
  update(entity: RegistrationDocumentEntity): Promise<void>;
  findAllByDriverRegId(
    driverRegId: string,
  ): Promise<RegistrationDocumentEntity[]>;
  findOneByDriverRegIdAndDocumentTypeId(
    driverRegId: string,
    documentTypeId: string,
  ): Promise<Option<RegistrationDocumentEntity>>;
}
