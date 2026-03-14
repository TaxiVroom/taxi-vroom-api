import { Logger, Module, Provider } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { DriverRepository } from './database/driver.repository';
import { DriverMapper } from './driver.mapper';
import { DRIVER_REPOSITORY } from './driver.di-tokens';
import { CreateDriverWhenUserIsCreatedDomainEventHandler } from './application/event-handlers/create-driver-when-user-is-created.domain-event-handler';

const eventHandlers: Provider[] = [
  CreateDriverWhenUserIsCreatedDomainEventHandler,
];

const mappers: Provider[] = [DriverMapper];

const repositories: Provider[] = [
  { provide: DRIVER_REPOSITORY, useClass: DriverRepository },
];

@Module({
  imports: [CqrsModule],
  controllers: [],
  providers: [Logger, ...repositories, ...eventHandlers, ...mappers],
})
export class DriverModule {}
