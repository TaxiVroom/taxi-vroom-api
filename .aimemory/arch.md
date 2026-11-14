#N id|kind|path|note
AppModule|mod|src/app.module.ts|Config (validateEnv) first, EventEmitter, RequestContext, Cqrs, GraphQL (autoSchema), interceptors Context + Exception
Main|svc|src/main.ts|port 3000 hard-coded, Swagger at /docs, ValidationPipe transform+whitelist
RepoBase|repo|src/libs/db/prisma-repository.base.ts|insert/delete/transaction publish events; client is any; no generic update; tx maxWait 10s, timeout 30s
AggregateRoot|mod|src/libs/ddd/aggregate-root.base.ts|addEvent, publishEvents via emitAsync, awaited by the repository
Storage|svc|src/libs/storage/firebase-storage.adapter.ts|StoragePort: upload, delete, signed URL
AuthGuards|mw|src/modules/auth/|global guards: FirebaseAuthGuard then RolesGuard @ltm:platform
RideModule|mod|src/modules/ride/|estimate, dispatch, ride lifecycle @ltm:rideLifecycle
RideEntity|agg|src/modules/ride/domain/ride.entity.ts|every rule of the ride; steps are a discriminated union in ride.types.ts
TaxiFare|mod|src/modules/ride/domain/taxi-fare.ts|estimateFare, isTariffOutdated @ltm:priceEstimate
RideDispatcher|svc|src/modules/ride/application/ride-dispatcher.ts|offers to the next closest driver, 3 attempts on a race
RideOfferTimer|svc|src/modules/ride/application/ride-offer-timer.ts|15 s timer in memory; at startup and every minute, dispatches ExpireOverdueOffersCommand, which locks all rides with an offer pending over 15 s in one query (FOR UPDATE SKIP LOCKED) and expires them, so a restart loses none, up to a minute late
RidePublisher|svc|src/modules/ride/application/ride-publisher.ts|writes rides/ and rideOffers/ after commit
RideNotifier|svc|src/modules/ride/application/ride-notifier.ts|the ride's pushes, through SendPushCommand, which never fails
BookingStarter|svc|src/modules/ride/application/booking-starter.ts|each minute and at startup, one booking per transaction locked FOR UPDATE SKIP LOCKED: go-online reminder 45 min before pickup, deadline 30 min before (committed driver online → DRIVER_ASSIGNED, else removed + dispatcher), not left 10 min before → removed + dispatcher; fixed times only, no route computing; temporary until a job queue, spec reservations-a-l-avance.md
Notification|mod|src/modules/notification|push_registrations, one phone per user, FCM adapter, token deleted when FCM says it is gone
RideRealtime|svc|src/modules/ride/infrastructure/firebase-ride-realtime.adapter.ts|RideRealtimePort @ltm:realtime
DriverLocator|svc|src/modules/ride/infrastructure/firebase-driver-locator.adapter.ts|geohash queries on drivers/
FindMyRides|uc|src/modules/ride/queries/find-my-rides/find-my-rides.query-handler.ts|passenger's completed rides, latest first
RegistrationModule|mod|src/modules/registration/|passenger and driver onboarding, documents @ltm:registration
AdminModule|mod|src/modules/admin/|validates registration documents and renewed driver documents (optional corrected expiresAt), dispatching the registration's and the driver's commands; no admin role yet
UserModule|mod|src/modules/user/|created from RegistrationCompleted; find-users; delete-user; GetMyProfileQuery (profile of the "Compte" tab, also sent by the driver module)
DriverModule|mod|src/modules/driver/|Driver row, vehicle and documents from UserCreated; document states computed from dates (GetDriverDocumentStatesQuery, used by dispatch, bookings and go online); renewal (driver_document_submissions); go online writes onlineAllowed/<uid>; document jobs and tasks; takes blocked drivers offline after RideEnded
EnterpriseContactModule|mod|src/modules/enterprise-contact/|one controller, GET enterprise-contact returns CONTACT_PHONE from ConfigService; no table, no query
PassengerModule|mod|src/modules/passenger/|Passenger row from UserCreated; "Maison"/"Travail": passenger_saved_places keyed (passengerId, kind), PassengerSavedPlaceEntity (address sent by the app from Mapbox, kept as is like a ride's destinationName; never empty), add/change/delete commands, FindMySavedPlacesQuery; routes GET/POST me/saved-places, PATCH/DELETE me/saved-places/:kind
WalletModule|mod|src/modules/wallet/|Wallet row from UserCreated; deposit/withdraw exist, no route and no caller

#E from>rel>to
RegistrationModule>emits RegistrationCompleted>UserModule
UserModule>emits UserCreated>DriverModule
UserModule>emits UserCreated>PassengerModule
UserModule>emits UserCreated>WalletModule
AdminModule>dispatches ValidateRegistrationDocumentCommand>RegistrationModule
RideEntity>uses>TaxiFare
RideDispatcher>uses>RideEntity
RideDispatcher>uses>DriverLocator
RideDispatcher>uses>RideOfferTimer
RideDispatcher>uses>RidePublisher
RidePublisher>uses>RideRealtime
RideOfferTimer>dispatches ExpireRideOfferCommand>RideModule

#B key=value
jobQueue=Graphile Worker chosen by the user 2026-11-07 for scheduled jobs (documents reminders and expiry): tasks in Postgres, run by a worker inside the NestJS server, jobKey to replace or remove; BullMQ rejected (needs Redis, outside our Postgres transactions, volume too small to need it), pg-boss rejected (cancel by generated id); full reasons in docs/specs/documents-du-chauffeur.md, point 12; not installed yet; jobs only act (pushes, offline), they write no state: a document's state is computed from documents.expiresAt and document_types.requiredFrom (point 13)
stack=NestJS+Prisma7+Postgres+CQRS+DDD+FirebaseAdmin(Auth,RTDB,Storage)+MapboxDirections+geo.api.gouv.fr+calendrier.api.gouv.fr
pickupName=the API looks up no address since 2026-11-11 (Géoplateforme removed, it was down): POST rides takes originName from the app (Mapbox), "Position de départ" without it; saved places keep the address the app sends; Mapbox licence risk in docs/a-faire.md
http=all routes under /v1; GraphQL at /graphql; Swagger at /docs
routesRide=GET rides/recent-destinations (passenger, raw SQL DISTINCT ON), POST rides (estimate), rides/:id/request, accept, decline, arrive, start, complete, cancel, withdraw, no-show, rating; GET rides (passenger's completed rides), GET rides/current (passenger or driver, 404 without one), GET rides/:id/boarding-code
routesRegistration=GET registration-flows/me (get or create), PATCH me, GET me/email-availability, POST+GET me/documents, GET me/documents/:documentTypeId/url, GET registration-document-types, POST passengers (completes the passenger)
routesBooking=POST rides with pickupAt (estimate for later), rides/:id/book, rides/:id/booking/accept, withdraw, refuse and depart ("Je pars", DRIVER_ASSIGNED → DRIVER_EN_ROUTE with an accepted offer); GET rides/booked?limit&page (passenger, paged since 2026-11-14, { data, count, limit, page }), bookings/available?latitude&longitude&limit&page and bookings/accepted?limit&page (driver, canDepart, paged since 2026-11-14: available reads the ids and positions of the box, keeps those within 20 km, then reads the page's rows by id in); cancel also from BOOKED and DRIVER_ASSIGNED
bookingModel=rides.kind IMMEDIATE|SCHEDULED; ride_schedules (rideId key, pickupAt, tripMeters) from the estimate on; ride_schedule_drivers (rideId key: one driver at most, created not upserted); ride_schedule_withdrawals (by the driver or the server, both excluded from the backup search); ride_schedule_refusals; ride_schedule_alerts (GO_ONLINE only, sent once); BOOKED and DRIVER_ASSIGNED only for SCHEDULED, checked by RideEntity (no CHECK, see prefs prismaOnlySchema); a DRIVER_ASSIGNED driver is busy for immediate offers (findBusyDriverIds)
fallbackTariff=FALLBACK_TARIFF_DEPARTMENT (demo only, 67): a position without tariffs takes this département's; a geo.api failure still throws
routesOther=GET+POST users, DELETE users/:id, GET me (role and profile: firstName, lastName, phone, email), PUT+DELETE me/push-registration, GET enterprise-contact, PATCH admin/registration-documents/:documentId/validate, PATCH admin/driver-documents/:submissionId/validate
routesDriver=GET drivers/me/account (profile, vehicle or null, documents: three queries through the QueryBus, the "Compte" tab), GET drivers/me/documents (state of each type, same shape as the account's documents: DriverDocumentsResponseDto.fromReadModel), POST drivers/me/documents/:documentTypeId (renewal, multipart), POST drivers/me/online (409 DRIVER.DOCUMENTS_BLOCKING), GET drivers/me/earnings?period=TODAY|WEEK|MONTH and GET drivers/me/activity (both in the ride module, spec docs/specs/gains-reels.md)
passengerSeats=GetDriverSeatsQuery (driver module, one findMany for many drivers, nothing for a driver without vehicle = 0 seats = no ride) read by EstimateRideService, RideDispatcher (private withSeats), AcceptBookingService and FindAvailableBookingsQuery (passengerCount lte seats in its own Prisma query, never the domain); RideEntity filters in closestFreeDriver, guards acceptBooking (RIDE.NOT_ENOUGH_SEATS) and complete (RIDE.INVALID_PASSENGER_SUPPLEMENT, extraPassengerCents read by rideRepo.findExtraPassengerCents through rides.tariffId); supplement = tariff.extraPassengerCents x max(0, passengers - 4) added to both ends of the range in taxi-fare.ts; GET rides/:id/checkout (driver of the ride) gives passengerCount and extraPassengerCents; spec docs/specs/nombre-de-passagers.md
driverFigures=ride module queries: GetMyEarningsQuery (one findMany on ride_completions of the period, meter + supplements summed per Paris day in memory; period days computed at noon UTC so the server's time zone never shifts a date), GetMyRatingQuery (aggregate of all ratings, null without any), GetMyAcceptanceRateQuery ($queryRaw: last 100 non-PENDING offers, minus "Je pars" offers (acceptedAt = offeredAt) and offers expired by the passenger's cancellation (expiredAt = cancelledAt), ACCEPTED or WITHDRAWN count as accepted, null under 10); activity controller dispatches TODAY and WEEK earnings, rating and acceptance through the QueryBus
parisDay=src/libs/utils/paris-day.ts: endOfParisDay, lastParisDayBefore, startOfParisDay, parisDayOf
jobs=Graphile Worker tasks: document-reminder, document-expiry, document-type-reminder, document-type-deadline, document-type-added, document-validated-push (driver module), registration-validated-push (notification module); scheduled by add_job inside the write's transaction (transactional outbox), never an external call from a domain event handler
rideErrors=codes in src/modules/ride/domain/ride.errors.ts; the mobile reads 409 on cancel and accept, 422 on estimate, order and start
writeFlow=route (src/configs/app.routes.ts) → *.http.controller.ts (builds a *.command.ts, commandBus.execute()) → *.service.ts (@CommandHandler) → domain/*.entity.ts (business rules, this.addEvent(...)) → database/*.repository.ts (extends PrismaRepositoryBase, write wrapped in repo.transaction(...)) → event published → application/event-handlers/*.domain-event-handler.ts (@OnEvent, may live in another module); the read flow is a *.query-handler.ts on PrismaService, see prefs cqrsRead
scripts=npm run start:dev (dev server, hot reload); lint = eslint --fix; deps:validate = architecture boundaries through .dependency-cruiser.js; migration:dev creates and applies a dev migration (npm run migration:dev -- --name X [--create-only]); migration:deploy applies pending ones (production); migration:reset drops, recreates and remigrates; migration:status; db:seed fills the reference data, a reset no longer does it; prisma:generate regenerates the client; prisma:studio opens the data browser; schema and migrations live in prisma/
staleClient=after migration:dev run prisma:generate: since Prisma 7 migrate dev no longer regenerates the client, and tsc cannot catch a stale client because PrismaRepositoryBase.client is typed any
dbEnv=env vars of the database are listed in .env.example (DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_NAME), but see hyp envExampleStale
dockerDb=docker compose in docker/: postgres-container on 5432 (db ddh), pgadmin on 5050
dbRead=docker exec postgres-container sh -c 'psql -U "$POSTGRES_USER" -d ddh -c "..."' reads the dev database without opening .env
migrationFlow=migration:dev then prisma:generate; a data insert needs --create-only then a hand edit; partial unique indexes on ride_offers are written by hand in add_rides
seed=reset does not seed since Prisma 7; run db:seed, it fills document_types and a demo passenger John Doe; the Bas-Rhin tariff row is not in the seed
adminValidation=PATCH admin route needs any Firebase token, no admin role yet (TODO in controller)
releaseTodo=before the first staging/prod release, create a dedicated server Mapbox token: MAPBOX_ACCESS_TOKEN is the default public one since 2026-10-21 because a new token asked for a payment method, and the default one cannot be deleted

# stub for LTM overflow
#N product|@ltm|ltm:product|Ride-hailing for French taxis; realtime and supply decisions
#N priceEstimate|@ltm|ltm:priceEstimate|validated estimate design, formula, Bas-Rhin tariff
#N rideLifecycle|@ltm|ltm:rideLifecycle|statuses, offers, dispatch, who can do what, limits
#N realtime|@ltm|ltm:realtime|Firebase paths written and read by the API
#N registration|@ltm|ltm:registration|onboarding steps, documents, user creation chain
#N platform|@ltm|ltm:platform|auth, guards, transactions, events, data model map
