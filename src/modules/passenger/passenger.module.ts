import { Logger, Module, Provider } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PassengerRepository } from './database/passenger.repository';
import { PassengerMapper } from './passenger.mapper';
import { PASSENGER_REPOSITORY } from './passenger.di-tokens';
import { CreatePassengerWhenUserIsCreatedDomainEventHandler } from './application/event-handlers/create-passenger-when-user-is-created.domain-event-handler';

const eventHandlers: Provider[] = [
  CreatePassengerWhenUserIsCreatedDomainEventHandler,
];

const mappers: Provider[] = [PassengerMapper];

const repositories: Provider[] = [
  { provide: PASSENGER_REPOSITORY, useClass: PassengerRepository },
];

@Module({
  imports: [CqrsModule],
  controllers: [],
  providers: [Logger, ...repositories, ...eventHandlers, ...mappers],
})
export class PassengerModule {}
