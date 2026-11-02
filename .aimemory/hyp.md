#H id|status|claim|evidence
alsaceHolidaysNight|open|The 2 Alsace-only public holidays count for the night tariff in Bas-Rhin|assumed by zone alsace-moselle; to ask the Bas-Rhin DDPP
fareRangeNarrowing|open|Knowing when tariff C applies would shrink the range to one tariff plus a traffic margin|needs the exact rule of the arrêté du 26 janvier 2026 and the driver's commune de rattachement (not stored); user chose to leave it for now, 2026-10-22
usersRoutesUnprotected|open|GET /users and DELETE /users/:id are open to any valid Firebase token|no @Roles and no @Public in the user controllers, global guards only check the token; read 2026-11-02, not exploited
createUserDead|open|POST /users, the CLI and the message controller have no handler|CreateUserService is commented out in user.module.ts; users only come from RegistrationCompleted
suspensionNotEnforced|open|A suspended driver can still get rides|Driver.isSuspended and DriverSuspensionEvent are read and written nowhere in src
documentReviewUnfinished|open|An admin cannot reject a document, and reviews leave no trace|markAsRejected and requireCorrections have no caller, no reject route; the validation and rejection event tables are never written; admins table never filled
documentsTableEmpty|open|Validated registration documents are never copied to the documents table|no code reads or writes Document, so expiresAt is unused; the mobile documents check is fake
estimatedRidesPileUp|open|Abandoned ESTIMATED rides stay in the database forever|each estimate inserts a row, no cleanup exists, cancel refuses ESTIMATED
offerLostOnRestart|open|An offer pending during a server restart never expires, its ride stays stuck in SEARCHING_DRIVER|RideOfferTimer is in memory, its own comment says so
noCurrentRideRoute|open|There is no read route for a ride, a history or a current ride|the only ride GET is boarding-code; needed for rating, history and resuming after an app restart
supplementsTrustClient|likely|Supplement labels and prices are trusted from the driver app|complete-ride request carries label and unitPriceCents; the mobile list is fake; no server rule checks them
envExampleStale|likely|.env.example does not match env.validation.ts|it lists DB_* and JWT_*, not DATABASE_URL which is required
depsValidateCrash|open|npm run deps:validate crashes|seen before 2026-10-21, not re-run since

#C id|model|links
rideFlow|ESTIMATED→SEARCHING_DRIVER→NO_DRIVER_FOUND or DRIVER_EN_ROUTE (withdrawal returns to SEARCHING_DRIVER)→DRIVER_ARRIVED (→PASSENGER_NO_SHOW)→IN_PROGRESS→COMPLETED, plus CANCELLED|#N:RideEntity
requestLifecycle|ContextInterceptor→FirebaseAuthGuard→RolesGuard→controller→CommandBus→service→entity→repository transaction→publish domain events→realtime publish after commit|#N:AuthGuards #N:RepoBase #N:RidePublisher
userCreation|RegistrationCompleted→User→UserCreated→Passenger or Driver + Wallet, all awaited through emitAsync|#N:UserModule
