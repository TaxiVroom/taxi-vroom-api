import { Logger, Module, Provider } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { StorageModule } from '@libs/storage/storage.module';
import { DriverRepository } from './database/driver.repository';
import { DriverDocumentSubmissionRepository } from './database/driver-document-submission.repository';
import { DriverMapper } from './driver.mapper';
import { DriverDocumentSubmissionMapper } from './driver-document-submission.mapper';
import {
  DRIVER_DOCUMENT_SUBMISSION_REPOSITORY,
  DRIVER_ONLINE_PERMISSION,
  DRIVER_REPOSITORY,
} from './driver.di-tokens';
import { CreateDriverWhenUserIsCreatedDomainEventHandler } from './application/event-handlers/create-driver-when-user-is-created.domain-event-handler';
import { TakeDriverOfflineWhenRideEndedDomainEventHandler } from './application/event-handlers/take-driver-offline-when-ride-ended.domain-event-handler';
import { DriverDocumentJobs } from './application/driver-document-jobs';
import { DriverDocumentTasks } from './application/driver-document-tasks';
import { FirebaseDriverOnlinePermissionAdapter } from './infrastructure/firebase-driver-online-permission.adapter';
import { GetMyAccountHttpController } from './queries/get-my-account/get-my-account.http.controller';
import { FindMyVehicleQueryHandler } from './queries/find-my-vehicle/find-my-vehicle.query-handler';
import { GetMyDocumentsHttpController } from './queries/get-driver-document-states/get-my-documents.http.controller';
import { GetDriverDocumentStatesQueryHandler } from './queries/get-driver-document-states/get-driver-document-states.query-handler';
import { FindDriversWithoutDocumentQueryHandler } from './queries/find-drivers-without-document/find-drivers-without-document.query-handler';
import { GoOnlineHttpController } from './commands/go-online/go-online.http.controller';
import { GoOnlineService } from './commands/go-online/go-online.service';
import { TakeBlockedDriversOfflineService } from './commands/take-blocked-drivers-offline/take-blocked-drivers-offline.service';
import { SubmitDriverDocumentHttpController } from './commands/submit-driver-document/submit-driver-document.http.controller';
import { SubmitDriverDocumentService } from './commands/submit-driver-document/submit-driver-document.service';
import { ScheduleDocumentJobsService } from './commands/schedule-document-jobs/schedule-document-jobs.service';
import { ValidateDriverDocumentService } from './commands/validate-driver-document/validate-driver-document.service';

const httpControllers = [
  GetMyAccountHttpController,
  GetMyDocumentsHttpController,
  GoOnlineHttpController,
  SubmitDriverDocumentHttpController,
];

const commandHandlers: Provider[] = [
  GoOnlineService,
  TakeBlockedDriversOfflineService,
  SubmitDriverDocumentService,
  ValidateDriverDocumentService,
  ScheduleDocumentJobsService,
];

const queryHandlers: Provider[] = [
  FindMyVehicleQueryHandler,
  GetDriverDocumentStatesQueryHandler,
  FindDriversWithoutDocumentQueryHandler,
];

const eventHandlers: Provider[] = [
  CreateDriverWhenUserIsCreatedDomainEventHandler,
  TakeDriverOfflineWhenRideEndedDomainEventHandler,
];

const applicationServices: Provider[] = [
  DriverDocumentJobs,
  DriverDocumentTasks,
];

const mappers: Provider[] = [DriverMapper, DriverDocumentSubmissionMapper];

const repositories: Provider[] = [
  { provide: DRIVER_REPOSITORY, useClass: DriverRepository },
  {
    provide: DRIVER_DOCUMENT_SUBMISSION_REPOSITORY,
    useClass: DriverDocumentSubmissionRepository,
  },
];

const adapters: Provider[] = [
  {
    provide: DRIVER_ONLINE_PERMISSION,
    useClass: FirebaseDriverOnlinePermissionAdapter,
  },
];

@Module({
  imports: [CqrsModule, StorageModule],
  controllers: [...httpControllers],
  providers: [
    Logger,
    ...repositories,
    ...commandHandlers,
    ...eventHandlers,
    ...queryHandlers,
    ...applicationServices,
    ...mappers,
    ...adapters,
  ],
})
export class DriverModule {}
