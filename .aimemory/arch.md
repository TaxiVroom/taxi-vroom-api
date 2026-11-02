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
RideOfferTimer|svc|src/modules/ride/application/ride-offer-timer.ts|15 s, in memory only
RidePublisher|svc|src/modules/ride/application/ride-publisher.ts|writes rides/ and rideOffers/ after commit
RideNotifier|svc|src/modules/ride/application/ride-notifier.ts|the ride's pushes, through SendPushCommand, which never fails
Notification|mod|src/modules/notification|push_registrations, one phone per user, FCM adapter, token deleted when FCM says it is gone
RideRealtime|svc|src/modules/ride/infrastructure/firebase-ride-realtime.adapter.ts|RideRealtimePort @ltm:realtime
DriverLocator|svc|src/modules/ride/infrastructure/firebase-driver-locator.adapter.ts|geohash queries on drivers/
AddressFinder|svc|src/modules/ride/infrastructure/geoplateforme-address-finder.adapter.ts|reverse geocoding at the estimate, 2 s timeout, None on failure
FindMyRides|uc|src/modules/ride/queries/find-my-rides/find-my-rides.query-handler.ts|passenger's completed rides, latest first
RegistrationModule|mod|src/modules/registration/|passenger and driver onboarding, documents @ltm:registration
AdminModule|mod|src/modules/admin/|only validate-registration-document, dispatches registration's command
UserModule|mod|src/modules/user/|created from RegistrationCompleted; find-users; delete-user
DriverModule|mod|src/modules/driver/|Driver row from UserCreated, no route
PassengerModule|mod|src/modules/passenger/|Passenger row from UserCreated, no route
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
stack=NestJS+Prisma7+Postgres+CQRS+DDD+FirebaseAdmin(Auth,RTDB,Storage)+MapboxDirections+geo.api.gouv.fr+calendrier.api.gouv.fr
http=all routes under /v1; GraphQL at /graphql; Swagger at /docs
routesRide=POST rides (estimate), rides/:id/request, accept, decline, arrive, start, complete, cancel, withdraw, no-show, rating; GET rides (passenger's completed rides), GET rides/current (passenger or driver, 404 without one), GET rides/:id/boarding-code
routesRegistration=GET registration-flows/me (get or create), PATCH me, GET me/email-availability, POST+GET me/documents, GET me/documents/:documentTypeId/url, GET registration-document-types, POST passengers (completes the passenger)
routesOther=GET+POST users, DELETE users/:id, GET me, PUT+DELETE me/push-registration, PATCH admin/registration-documents/:documentId/validate
rideErrors=codes in src/modules/ride/domain/ride.errors.ts; the mobile reads 409 on cancel and accept, 422 on estimate, order and start
dockerDb=docker compose in docker/: postgres-container on 5432 (db ddh), pgadmin on 5050
dbRead=docker exec postgres-container sh -c 'psql -U "$POSTGRES_USER" -d ddh -c "..."' reads the dev database without opening .env
migrationFlow=migration:dev then prisma:generate; a data insert needs --create-only then a hand edit; partial unique indexes on ride_offers are written by hand in add_rides
seed=reset does not seed since Prisma 7; run db:seed, it fills document_types and a demo passenger John Doe; the Bas-Rhin tariff row is not in the seed
adminValidation=PATCH admin route needs any Firebase token, no admin role yet (TODO in controller)
releaseTodo=before the first staging/prod release, create a dedicated server Mapbox token: MAPBOX_ACCESS_TOKEN is the default public one since 2026-10-21 because a new token asked for a payment method, and the default one cannot be deleted

# stub for LTM overflow
#N product|@ltm|ltm:product|Uber-like for French taxis; realtime and supply decisions
#N priceEstimate|@ltm|ltm:priceEstimate|validated estimate design, formula, Bas-Rhin tariff
#N rideLifecycle|@ltm|ltm:rideLifecycle|statuses, offers, dispatch, who can do what, limits
#N realtime|@ltm|ltm:realtime|Firebase paths written and read by the API
#N registration|@ltm|ltm:registration|onboarding steps, documents, user creation chain
#N platform|@ltm|ltm:platform|auth, guards, transactions, events, data model map
