#H id|status|claim|evidence
depsValidateViolations|open|deps:validate runs since dependency-cruiser 16.10.4 and reports 5 old errors|false positive request-ride (its path matches the api rule 'request'), type-only express import in firebase-auth.guard, orphan create-user.service (commented out in user.module), real: get-driver-documents and get-document-types query handlers return DTOs, 2026-11-02
alsaceHolidaysNight|open|The 2 Alsace-only public holidays count for the night tariff in Bas-Rhin|assumed by zone alsace-moselle; to ask the Bas-Rhin DDPP
fareRangeNarrowing|open|Knowing when tariff C applies would shrink the range to one tariff plus a traffic margin|needs the exact rule of the arrêté du 26 janvier 2026 and the driver's commune de rattachement (not stored); user chose to leave it for now, 2026-10-22
usersRoutesUnprotected|open|GET /users and DELETE /users/:id are open to any valid Firebase token|no @Roles and no @Public in the user controllers, global guards only check the token; read 2026-11-02, not exploited; same for the admin validate route. User postponed the fix 2026-11-02: do not bring it up again, except before a public repo or a production release
createUserDead|open|POST /users, the CLI and the message controller have no handler|CreateUserService is commented out in user.module.ts; users only come from RegistrationCompleted
suspensionNotEnforced|open|A suspended driver can still get rides|Driver.isSuspended and DriverSuspensionEvent are read and written nowhere in src
documentReviewUnfinished|open|An admin cannot reject a document, and reviews leave no trace|markAsRejected and requireCorrections have no caller, no reject route; the validation and rejection event tables are never written; admins table never filled
documentsTableEmpty|open|Validated registration documents are never copied to the documents table|no code reads or writes Document, so expiresAt is unused; the mobile documents check is fake
estimatedRidesPileUp|open|Abandoned ESTIMATED rides stay in the database forever|each estimate inserts a row, no cleanup exists, cancel refuses ESTIMATED
offerLostOnRestart|open|An offer pending during a server restart never expires, its ride stays stuck in SEARCHING_DRIVER|RideOfferTimer is in memory, its own comment says so
stuckRideBlocksDriver|open|A ride left in DRIVER_EN_ROUTE makes its driver busy forever, while passengers still see them free on the map|2026-11-02: ride from 22 Oct, no way to end it once both apps were closed; going online writes available true in Firebase, the server reads busy from Postgres
geoApiUnstable|open|geo.api.gouv.fr down stops every estimate|502, 504, 11 s and timeouts on 2026-11-02, no timeout in the adapter; proposal: fall back on Géoplateforme, decision pending
supplementsTrustClient|likely|Supplement labels and prices are trusted from the driver app|complete-ride request carries label and unitPriceCents; the mobile list is fake; no server rule checks them
envExampleStale|likely|.env.example does not match env.validation.ts|it lists DB_* and JWT_*, not DATABASE_URL which is required

#C id|model|links
rideFlow|ESTIMATED→(booking: BOOKED→DRIVER_ASSIGNED→DRIVER_EN_ROUTE, or BOOKED/DRIVER_ASSIGNED→SEARCHING_DRIVER)→SEARCHING_DRIVER→NO_DRIVER_FOUND or DRIVER_EN_ROUTE (withdrawal returns to SEARCHING_DRIVER)→DRIVER_ARRIVED (→PASSENGER_NO_SHOW)→IN_PROGRESS→COMPLETED, plus CANCELLED|#N:RideEntity
requestLifecycle|ContextInterceptor→FirebaseAuthGuard→RolesGuard→controller→CommandBus→service→entity→repository transaction→publish domain events→realtime publish after commit|#N:AuthGuards #N:RepoBase #N:RidePublisher
userCreation|RegistrationCompleted→User→UserCreated→Passenger or Driver + Wallet, all awaited through emitAsync|#N:UserModule
