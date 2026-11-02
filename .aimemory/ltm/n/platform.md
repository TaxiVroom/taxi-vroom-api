# id: platform
# tags: auth,firebase,guards,roles,transactions,events,prisma,schema,libs
# sum: Auth, guards, transactions, events, data model map

#N id|kind|path|note
AuthGuard|mw|src/modules/auth/firebase-auth.guard.ts|verifyIdToken, sets GuestUser; @Public skips it
RolesGuard|mw|src/modules/auth/roles.guard.ts|reads the role in Postgres, sets RegisteredUser; TODO Firebase custom claims
CurrentUser|mw|src/modules/auth/current-user.decorator.ts|GuestUser without @Roles, RegisteredUser with it
RequestContext|svc|src/libs/application/context/AppRequestContext.ts|request id and ambient transaction
Exceptions|mod|src/libs/exceptions/|ExceptionBase, generic exceptions
ExceptionInterceptor|svc|src/libs/application/interceptors/exception.interceptor.ts|adds correlationId, reshapes validation errors
EnvValidation|cfg|src/configs/env.validation.ts|zod, the app refuses to boot on a missing variable
Schema|db|prisma/schema.prisma|commented, reference for the data model

#F durable facts
all routes need a Firebase token unless @Public; no route uses @Public today
@Roles is only on ride routes; the registration flow runs as GuestUser since the User row does not exist yet
ids: User.id is the Firebase UID; other ids are UUIDs from the domain layer
RolesGuard does one user query per protected request
transaction: the tx client lives in the request context, repositories read it through this.client
events: emitAsync is awaited, so handlers run inside the caller's flow
data model: users + passengers, drivers, admins (1-1); Registration + PassengerRegistration, DriverRegistration; RegistrationDocument + validation and rejection events; Document; DriverSuspensionEvent; Wallet
ride model: rides + cancellation, no_driver_found; ride_offers + acceptance, decline, expiration; acceptance + boarding_code, arrival, withdrawal; arrival + start, no_show; start + completion + supplements
status columns select the sub-table; the database does not check they match, RideEntity does
template leftovers from the starter project: tests/, graphql-example, ARCHITECTURE-GUIDE.md, Address value object, commented-out user methods, .spec files
