import { Logger, Module, Provider } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { RideMapper } from './ride.mapper';
import { RideRepository } from './database/ride.repository';
import {
  ADDRESS_FINDER,
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
import { GeoplateformeAddressFinderAdapter } from './infrastructure/geoplateforme-address-finder.adapter';
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
import { ExpireOverdueOffersService } from './commands/expire-overdue-offers/expire-overdue-offers.service';
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
import { RateRideHttpController } from './commands/rate-ride/rate-ride.http.controller';
import { RateRideService } from './commands/rate-ride/rate-ride.service';
import { FindCurrentRideHttpController } from './queries/find-current-ride/find-current-ride.http.controller';
import { FindCurrentRideQueryHandler } from './queries/find-current-ride/find-current-ride.query-handler';
import { RideNotifier } from './application/ride-notifier';
import { BookingStarter } from './application/booking-starter';
import { BookRideHttpController } from './commands/book-ride/book-ride.http.controller';
import { BookRideService } from './commands/book-ride/book-ride.service';
import { AcceptBookingHttpController } from './commands/accept-booking/accept-booking.http.controller';
import { AcceptBookingService } from './commands/accept-booking/accept-booking.service';
import { WithdrawFromBookingHttpController } from './commands/withdraw-from-booking/withdraw-from-booking.http.controller';
import { WithdrawFromBookingService } from './commands/withdraw-from-booking/withdraw-from-booking.service';
import { RefuseBookingHttpController } from './commands/refuse-booking/refuse-booking.http.controller';
import { RefuseBookingService } from './commands/refuse-booking/refuse-booking.service';
import { DepartForBookingHttpController } from './commands/depart-for-booking/depart-for-booking.http.controller';
import { DepartForBookingService } from './commands/depart-for-booking/depart-for-booking.service';
import { FindMyBookingsHttpController } from './queries/find-my-bookings/find-my-bookings.http.controller';
import { FindMyBookingsQueryHandler } from './queries/find-my-bookings/find-my-bookings.query-handler';
import { FindAvailableBookingsHttpController } from './queries/find-available-bookings/find-available-bookings.http.controller';
import { FindAvailableBookingsQueryHandler } from './queries/find-available-bookings/find-available-bookings.query-handler';
import { FindAcceptedBookingsHttpController } from './queries/find-accepted-bookings/find-accepted-bookings.http.controller';
import { FindAcceptedBookingsQueryHandler } from './queries/find-accepted-bookings/find-accepted-bookings.query-handler';
import { FindMyRidesHttpController } from './queries/find-my-rides/find-my-rides.http.controller';
import { FindMyRidesQueryHandler } from './queries/find-my-rides/find-my-rides.query-handler';
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
  RateRideHttpController,
  FindCurrentRideHttpController,
  FindMyRidesHttpController,
  GetBoardingCodeHttpController,
  BookRideHttpController,
  AcceptBookingHttpController,
  WithdrawFromBookingHttpController,
  RefuseBookingHttpController,
  DepartForBookingHttpController,
  FindMyBookingsHttpController,
  FindAvailableBookingsHttpController,
  FindAcceptedBookingsHttpController,
];

const commandHandlers: Provider[] = [
  EstimateRideService,
  RequestRideService,
  AcceptRideOfferService,
  DeclineRideOfferService,
  ExpireRideOfferService,
  ExpireOverdueOffersService,
  ArriveAtPickupService,
  StartRideService,
  CompleteRideService,
  CancelRideService,
  WithdrawFromRideService,
  ReportNoShowService,
  RateRideService,
  BookRideService,
  AcceptBookingService,
  WithdrawFromBookingService,
  RefuseBookingService,
  DepartForBookingService,
];

const queryHandlers: Provider[] = [
  FindCurrentRideQueryHandler,
  FindMyRidesQueryHandler,
  GetBoardingCodeQueryHandler,
  FindMyBookingsQueryHandler,
  FindAvailableBookingsQueryHandler,
  FindAcceptedBookingsQueryHandler,
];

const applicationServices: Provider[] = [
  RideDispatcher,
  RideOfferTimer,
  RidePublisher,
  RideNotifier,
  BookingStarter,
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
  { provide: ADDRESS_FINDER, useClass: GeoplateformeAddressFinderAdapter },
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
