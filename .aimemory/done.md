#L YYYY-MM-DD|topic|paths|outcome
2026-11-02|push-notifications|docs/specs/notifications-push.md,src/modules/notification,src/modules/ride,src/modules/user/queries/get-me,migration 20261102175136|registration, sending through RideNotifier, GET rides/current, GET me; tested on two Android emulators, uncommitted
2026-11-02|rating-and-history|docs/specs/notation-et-historique.md,src/modules/ride,migration 20261102094638|POST rating, GET rides, pickup address from Géoplateforme, driver stats in Firebase; tsc and lint clean; two-emulator test validated by the user, the supplement case has no row in the database after the fix
2026-11-02|memory-fill|.aimemory|whole code read and recorded: arch, hyp and 4 new ltm nodes (rideLifecycle, realtime, registration, platform); code untouched
2026-11-02|ai-memory|.aimemory,.claude/skills/build-memory,CLAUDE.md|memory system set up and versioned, same format in the mobile repo; INDEX and prefs imported in CLAUDE.md; CLAUDE.md cleaned of the previous project's examples and of the tests sections
2026-10-22|price-estimate|src/modules/ride,prisma migration 20261021101346_taxi_tariffs_and_estimates|real estimate shipped, commit 12f84e7, ride order tested on two emulators

#S older summaries
