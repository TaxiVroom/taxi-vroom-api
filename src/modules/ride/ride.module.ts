import { Logger, Module, Provider } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { RideMapper } from './ride.mapper';
import { RideRepository } from './database/ride.repository';
import {
  DRIVER_LOCATOR,
  RIDE_REALTIME,
  RIDE_REPOSITORY,
} from './ride.di-tokens';
import { FirebaseDriverLocatorAdapter } from './infrastructure/firebase-driver-locator.adapter';
import { FirebaseRideRealtimeAdapter } from './infrastructure/firebase-ride-realtime.adapter';
import { RideDispatcher } from './application/ride-dispatcher';
import { RideOfferTimer } from './application/ride-offer-timer';
import { RidePublisher } from './application/ride-publisher';
import { RequestRideHttpController } from './commands/request-ride/request-ride.http.controller';
import { RequestRideService } from './commands/request-ride/request-ride.service';
import { AcceptRideOfferHttpController } from './commands/accept-ride-offer/accept-ride-offer.http.controller';
import { AcceptRideOfferService } from './commands/accept-ride-offer/accept-ride-offer.service';
import { DeclineRideOfferHttpController } from './commands/decline-ride-offer/decline-ride-offer.http.controller';
import { DeclineRideOfferService } from './commands/decline-ride-offer/decline-ride-offer.service';
import { ExpireRideOfferService } from './commands/expire-ride-offer/expire-ride-offer.service';

const httpControllers = [
  RequestRideHttpController,
  AcceptRideOfferHttpController,
  DeclineRideOfferHttpController,
];

const commandHandlers: Provider[] = [
  RequestRideService,
  AcceptRideOfferService,
  DeclineRideOfferService,
  ExpireRideOfferService,
];

const applicationServices: Provider[] = [
  RideDispatcher,
  RideOfferTimer,
  RidePublisher,
];

const mappers: Provider[] = [RideMapper];

const repositories: Provider[] = [
  { provide: RIDE_REPOSITORY, useClass: RideRepository },
];

const adapters: Provider[] = [
  { provide: DRIVER_LOCATOR, useClass: FirebaseDriverLocatorAdapter },
  { provide: RIDE_REALTIME, useClass: FirebaseRideRealtimeAdapter },
];

@Module({
  imports: [CqrsModule],
  controllers: [...httpControllers],
  providers: [
    Logger,
    ...repositories,
    ...adapters,
    ...applicationServices,
    ...commandHandlers,
    ...mappers,
  ],
})
export class RideModule {}
