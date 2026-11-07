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
import { SaveRegistrationVehicleHttpController } from './commands/save-registration-vehicle/save-registration-vehicle.http.controller';
import { SaveRegistrationVehicleService } from './commands/save-registration-vehicle/save-registration-vehicle.service';
import { SaveRegistrationPushTokenHttpController } from './commands/save-registration-push-token/save-registration-push-token.http.controller';
import { SaveRegistrationPushTokenService } from './commands/save-registration-push-token/save-registration-push-token.service';
import { ForgetPushTokenWhenUserIsCreatedDomainEventHandler } from './application/event-handlers/forget-push-token-when-user-is-created.domain-event-handler';
import { FindRegistrationPushTokenQueryHandler } from './queries/find-registration-push-token/find-registration-push-token.query-handler';
import { CompleteRegistrationHttpController } from './commands/complete-registration/complete-registration.http.controller';
import { CompleteRegistrationService } from './commands/complete-registration/complete-registration.service';
import { SubmitRegistrationDocumentsHttpController } from './commands/submit-registration-documents/submit-registration-documents.http.controller';
import { SubmitRegistrationDocumentsService } from './commands/submit-registration-documents/submit-registration-documents.service';
import { ValidateRegistrationDocumentService } from './commands/validate-registration-document/validate-registration-document.service';
import { CheckEmailAvailabilityHttpController } from './queries/check-email-availability/check-email-availability.http.controller';
import { CheckEmailAvailabilityQueryHandler } from './queries/check-email-availability/check-email-availability.query-handler';
import { GetDocumentTypesHttpController } from './queries/get-document-types/get-document-types.http.controller';
import { GetDocumentTypesQueryHandler } from './queries/get-document-types/get-document-types.query-handler';
import { GetRegistrationDocumentUrlHttpController } from './queries/get-registration-document-url/get-registration-document-url.http.controller';
import { GetRegistrationDocumentUrlQueryHandler } from './queries/get-registration-document-url/get-registration-document-url.query-handler';
import { GetDriverDocumentsHttpController } from './queries/get-driver-documents/get-driver-documents.http.controller';
import { GetDriverDocumentsQueryHandler } from './queries/get-driver-documents/get-driver-documents.query-handler';
import { FindRegistrationVehicleQueryHandler } from './queries/find-registration-vehicle/find-registration-vehicle.query-handler';
import { FindRegistrationDocumentsQueryHandler } from './queries/find-registration-documents/find-registration-documents.query-handler';
import { CheckVehicleAvailabilityQueryHandler } from './queries/check-vehicle-availability/check-vehicle-availability.query-handler';

const httpControllers = [
  GetOrCreateRegistrationHttpController,
  UpdateRegistrationHttpController,
  SaveRegistrationVehicleHttpController,
  SaveRegistrationPushTokenHttpController,
  CompleteRegistrationHttpController,
  SubmitRegistrationDocumentsHttpController,
  CheckEmailAvailabilityHttpController,
  GetDocumentTypesHttpController,
  GetRegistrationDocumentUrlHttpController,
  GetDriverDocumentsHttpController,
];

const commandHandlers: Provider[] = [
  GetOrCreateRegistrationService,
  UpdateRegistrationService,
  SaveRegistrationVehicleService,
  SaveRegistrationPushTokenService,
  CompleteRegistrationService,
  SubmitRegistrationDocumentsService,
  ValidateRegistrationDocumentService,
];

const eventHandlers: Provider[] = [
  ForgetPushTokenWhenUserIsCreatedDomainEventHandler,
];

const queryHandlers: Provider[] = [
  CheckEmailAvailabilityQueryHandler,
  CheckVehicleAvailabilityQueryHandler,
  GetDocumentTypesQueryHandler,
  GetRegistrationDocumentUrlQueryHandler,
  GetDriverDocumentsQueryHandler,
  FindRegistrationVehicleQueryHandler,
  FindRegistrationDocumentsQueryHandler,
  FindRegistrationPushTokenQueryHandler,
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
    ...eventHandlers,
    ...commandHandlers,
    ...queryHandlers,
    ...mappers,
  ],
})
export class RegistrationModule {}
