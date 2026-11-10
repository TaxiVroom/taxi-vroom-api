import { Option } from 'oxide.ts';
import { RepositoryPort } from '@libs/ddd';
import { DriverDocumentSubmissionEntity } from '../domain/driver-document-submission.entity';
import { DriverDocumentTypeRules } from '../domain/driver-document-submission.types';

export interface DriverDocumentSubmissionRepositoryPort
  extends RepositoryPort<DriverDocumentSubmissionEntity> {
  findType(documentTypeId: string): Promise<Option<DriverDocumentTypeRules>>;
  // A new one replaces the one waiting, for the same type.
  upsert(submission: DriverDocumentSubmissionEntity): Promise<void>;
  // Validated: it replaces the driver's valid document and stops waiting.
  replaceDocument(submission: DriverDocumentSubmissionEntity): Promise<void>;
}
