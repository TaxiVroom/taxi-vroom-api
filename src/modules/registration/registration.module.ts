import { Logger, Module, Provider } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { RegistrationMapper } from './registration.mapper';
import { RegistrationRepository } from './database/registration.repository';
import { RegistrationDocumentMapper } from './registration-document.mapper';
import { RegistrationDocumentRepository } from './database/registration-document.repository';
import { DocumentTypeRepository } from './database/document-type.repository';
import {
  REGISTRATION_REPOSITORY,
  REGISTRATION_DOCUMENT_REPOSITORY,
  DOCUMENT_TYPE_REPOSITORY,
} from './registration.di-tokens';
import { StorageModule } from '@libs/storage/storage.module';
import { GetOrCreateRegistrationHttpController } from './commands/get-or-create-registration/get-or-create-registration.http.controller';
import { GetOrCreateRegistrationService } from './commands/get-or-create-registration/get-or-create-registration.service';
import { UpdateRegistrationHttpController } from './commands/update-registration/update-registration.http.controller';
import { UpdateRegistrationService } from './commands/update-registration/update-registration.service';
import { CompleteRegistrationHttpController } from './commands/complete-registration/complete-registration.http.controller';
import { CompleteRegistrationService } from './commands/complete-registration/complete-registration.service';
import { SubmitRegistrationDocumentsHttpController } from './commands/submit-registration-documents/submit-registration-documents.http.controller';
import { SubmitRegistrationDocumentsService } from './commands/submit-registration-documents/submit-registration-documents.service';
import { CheckEmailAvailabilityHttpController } from './queries/check-email-availability/check-email-availability.http.controller';
import { CheckEmailAvailabilityQueryHandler } from './queries/check-email-availability/check-email-availability.query-handler';
import { GetDocumentTypesHttpController } from './queries/get-document-types/get-document-types.http.controller';
import { GetDocumentTypesQueryHandler } from './queries/get-document-types/get-document-types.query-handler';
import { GetRegistrationDocumentUrlHttpController } from './queries/get-registration-document-url/get-registration-document-url.http.controller';
import { GetRegistrationDocumentUrlQueryHandler } from './queries/get-registration-document-url/get-registration-document-url.query-handler';

const httpControllers = [
  GetOrCreateRegistrationHttpController,
  UpdateRegistrationHttpController,
  CompleteRegistrationHttpController,
  SubmitRegistrationDocumentsHttpController,
  CheckEmailAvailabilityHttpController,
  GetDocumentTypesHttpController,
  GetRegistrationDocumentUrlHttpController,
];

const commandHandlers: Provider[] = [
  GetOrCreateRegistrationService,
  UpdateRegistrationService,
  CompleteRegistrationService,
  SubmitRegistrationDocumentsService,
];

const queryHandlers: Provider[] = [
  CheckEmailAvailabilityQueryHandler,
  GetDocumentTypesQueryHandler,
  GetRegistrationDocumentUrlQueryHandler,
];

const mappers: Provider[] = [RegistrationMapper, RegistrationDocumentMapper];

const repositories: Provider[] = [
  { provide: REGISTRATION_REPOSITORY, useClass: RegistrationRepository },
  {
    provide: REGISTRATION_DOCUMENT_REPOSITORY,
    useClass: RegistrationDocumentRepository,
  },
  { provide: DOCUMENT_TYPE_REPOSITORY, useClass: DocumentTypeRepository },
];

@Module({
  imports: [CqrsModule, StorageModule],
  controllers: [...httpControllers],
  providers: [
    Logger,
    ...repositories,
    ...commandHandlers,
    ...queryHandlers,
    ...mappers,
  ],
})
export class RegistrationModule {}
