import { Logger, Module, Provider } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { RideMapper } from './ride.mapper';
import { RideRepository } from './database/ride.repository';
import {
  DRIVER_LOCATOR,
  PUBLIC_HOLIDAYS,
  RIDE_REALTIME,
  RIDE_REPOSITORY,
  ROUTE_PLANNER,
  TERRITORY,
} from './ride.di-tokens';
import { FirebaseDriverLocatorAdapter } from './infrastructure/firebase-driver-locator.adapter';
import { FirebaseRideRealtimeAdapter } from './infrastructure/firebase-ride-realtime.adapter';
import { MapboxRoutePlannerAdapter } from './infrastructure/mapbox-route-planner.adapter';
import { GeoApiTerritoryAdapter } from './infrastructure/geo-api-territory.adapter';
import { CalendrierApiPublicHolidaysAdapter } from './infrastructure/calendrier-api-public-holidays.adapter';
import { RideDispatcher } from './application/ride-dispatcher';
import { RideOfferTimer } from './application/ride-offer-timer';
import { RidePublisher } from './application/ride-publisher';
import { EstimateRideHttpController } from './commands/estimate-ride/estimate-ride.http.controller';
import { EstimateRideService } from './commands/estimate-ride/estimate-ride.service';
import { RequestRideHttpController } from './commands/request-ride/request-ride.http.controller';
import { RequestRideService } from './commands/request-ride/request-ride.service';
import { AcceptRideOfferHttpController } from './commands/accept-ride-offer/accept-ride-offer.http.controller';
import { AcceptRideOfferService } from './commands/accept-ride-offer/accept-ride-offer.service';
import { DeclineRideOfferHttpController } from './commands/decline-ride-offer/decline-ride-offer.http.controller';
import { DeclineRideOfferService } from './commands/decline-ride-offer/decline-ride-offer.service';
import { ExpireRideOfferService } from './commands/expire-ride-offer/expire-ride-offer.service';
import { ArriveAtPickupHttpController } from './commands/arrive-at-pickup/arrive-at-pickup.http.controller';
import { ArriveAtPickupService } from './commands/arrive-at-pickup/arrive-at-pickup.service';
import { StartRideHttpController } from './commands/start-ride/start-ride.http.controller';
import { StartRideService } from './commands/start-ride/start-ride.service';
import { CompleteRideHttpController } from './commands/complete-ride/complete-ride.http.controller';
import { CompleteRideService } from './commands/complete-ride/complete-ride.service';
import { CancelRideHttpController } from './commands/cancel-ride/cancel-ride.http.controller';
import { CancelRideService } from './commands/cancel-ride/cancel-ride.service';
import { WithdrawFromRideHttpController } from './commands/withdraw-from-ride/withdraw-from-ride.http.controller';
import { WithdrawFromRideService } from './commands/withdraw-from-ride/withdraw-from-ride.service';
import { ReportNoShowHttpController } from './commands/report-no-show/report-no-show.http.controller';
import { ReportNoShowService } from './commands/report-no-show/report-no-show.service';
import { GetBoardingCodeHttpController } from './queries/get-boarding-code/get-boarding-code.http.controller';
import { GetBoardingCodeQueryHandler } from './queries/get-boarding-code/get-boarding-code.query-handler';

const httpControllers = [
  EstimateRideHttpController,
  RequestRideHttpController,
  AcceptRideOfferHttpController,
  DeclineRideOfferHttpController,
  ArriveAtPickupHttpController,
  StartRideHttpController,
  CompleteRideHttpController,
  CancelRideHttpController,
  WithdrawFromRideHttpController,
  ReportNoShowHttpController,
  GetBoardingCodeHttpController,
];

const commandHandlers: Provider[] = [
  EstimateRideService,
  RequestRideService,
  AcceptRideOfferService,
  DeclineRideOfferService,
  ExpireRideOfferService,
  ArriveAtPickupService,
  StartRideService,
  CompleteRideService,
  CancelRideService,
  WithdrawFromRideService,
  ReportNoShowService,
];

const queryHandlers: Provider[] = [GetBoardingCodeQueryHandler];

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
  { provide: ROUTE_PLANNER, useClass: MapboxRoutePlannerAdapter },
  { provide: TERRITORY, useClass: GeoApiTerritoryAdapter },
  { provide: PUBLIC_HOLIDAYS, useClass: CalendrierApiPublicHolidaysAdapter },
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
    ...queryHandlers,
    ...mappers,
  ],
})
export class RideModule {}
