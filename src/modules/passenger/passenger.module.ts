import { Logger, Module, Provider } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PassengerRepository } from './database/passenger.repository';
import { PassengerSavedPlaceRepository } from './database/passenger-saved-place.repository';
import { PassengerMapper } from './passenger.mapper';
import { PassengerSavedPlaceMapper } from './passenger-saved-place.mapper';
import {
  PASSENGER_REPOSITORY,
  PASSENGER_SAVED_PLACE_REPOSITORY,
} from './passenger.di-tokens';
import { CreatePassengerWhenUserIsCreatedDomainEventHandler } from './application/event-handlers/create-passenger-when-user-is-created.domain-event-handler';
import { AddSavedPlaceHttpController } from './commands/add-saved-place/add-saved-place.http.controller';
import { AddSavedPlaceService } from './commands/add-saved-place/add-saved-place.service';
import { ChangeSavedPlaceHttpController } from './commands/change-saved-place/change-saved-place.http.controller';
import { ChangeSavedPlaceService } from './commands/change-saved-place/change-saved-place.service';
import { DeleteSavedPlaceHttpController } from './commands/delete-saved-place/delete-saved-place.http.controller';
import { DeleteSavedPlaceService } from './commands/delete-saved-place/delete-saved-place.service';
import { FindMySavedPlacesHttpController } from './queries/find-my-saved-places/find-my-saved-places.http.controller';
import { FindMySavedPlacesQueryHandler } from './queries/find-my-saved-places/find-my-saved-places.query-handler';

const httpControllers = [
  FindMySavedPlacesHttpController,
  AddSavedPlaceHttpController,
  ChangeSavedPlaceHttpController,
  DeleteSavedPlaceHttpController,
];

const commandHandlers: Provider[] = [
  AddSavedPlaceService,
  ChangeSavedPlaceService,
  DeleteSavedPlaceService,
];

const queryHandlers: Provider[] = [FindMySavedPlacesQueryHandler];

const eventHandlers: Provider[] = [
  CreatePassengerWhenUserIsCreatedDomainEventHandler,
];

const mappers: Provider[] = [PassengerMapper, PassengerSavedPlaceMapper];

const repositories: Provider[] = [
  { provide: PASSENGER_REPOSITORY, useClass: PassengerRepository },
  {
    provide: PASSENGER_SAVED_PLACE_REPOSITORY,
    useClass: PassengerSavedPlaceRepository,
  },
];

@Module({
  imports: [CqrsModule],
  controllers: [...httpControllers],
  providers: [
    Logger,
    ...repositories,
    ...commandHandlers,
    ...queryHandlers,
    ...eventHandlers,
    ...mappers,
  ],
})
export class PassengerModule {}
