# aimemory
arch: confirmed hot modules/build
hyp: working hypotheses + concepts (revisable)
done: recent outcomes
prefs: feature workflow
ltm: durable cold graph, see ltm/CATALOG.md (do not bulk-load)
lifecycleStart: HARD, at the start of non-trivial work (planning, and again when executing an accepted plan): 1) load the other hot shards arch.md, hyp.md, done.md; 2) scan ltm/CATALOG.md for the task's tags and paths, then fetch the matching ltm/n/<id>.md and the relevant ltm/edges.md lines only, never bulk-load ltm/n/; 3) code wins over memory: on a conflict trust the code and correct the memory at the end
lifecycleEnd: HARD, before declaring a plan or feature done: arch = confirmed structure learned on the way; hyp = confirm or falsify the working models; done = one #L line per meaningful change; prefs = if the user stated or corrected a build preference, update prefs.md; ltm = promote only cold durable facts, never open hypotheses or prefs. Skip both steps for a trivial one-file edit with no architectural learning
lifecycleSpec: HARD, every decision or correction of the user about a feature goes into its spec right away, unasked (prefs specSync)
lifecycleSecrets: HARD, never store a secret in .aimemory; formats are in .claude/skills/build-memory/SKILL.md
lifecycleLoad: INDEX.md and prefs.md are loaded at the start of every session by the two @imports of CLAUDE.md, which holds nothing else since 2026-11-13 (the user's choice): never delete that file, or nothing loads this memory; never put a rule in it, rules go in .aimemory
specs: decisions of a feature live in docs/specs/<nom>.md, read the one matching the task
entry: src/main.ts → *.http.controller.ts → CommandBus → *.service.ts → domain/*.entity.ts → database/*.repository.ts → domain events
product: Ride-hailing app for French licensed taxis, backend authority for matching, pricing and history @ltm:product
priceEstimate: shipped and tested on two emulators; ride starts ESTIMATED, ordering moves it to SEARCHING_DRIVER @ltm:priceEstimate
ride: full ride works from estimate to completion, cancel, withdraw and no-show @ltm:rideLifecycle
registration: passenger and driver onboarding work, validated documents copied to documents, spec docs/specs/inscription-chauffeur.md; admin can only validate, not reject @ltm:registration
gaps: suspension, document rejection: see hyp; admin-only routes since 2026-11-16, spec docs/specs/acces-admin.md
rating: passenger rating and ride history shipped, spec docs/specs/notation-et-historique.md
push: shipped on Android, iOS waits for hardware, spec docs/specs/notifications-push.md
bookings: advance bookings shipped, spec docs/specs/reservations-a-l-avance.md
pickupPlace: the passenger chooses the pickup, named by the app's Mapbox address (originName) since 2026-11-11, Géoplateforme removed, spec docs/specs/point-de-prise-en-charge.md
documents: drivers' documents shipped (expiry, renewal, blocking, Graphile Worker jobs), spec docs/specs/documents-du-chauffeur.md
account: GET me (profile) and GET drivers/me/account feed the "Compte" tabs, spec docs/specs/compte-a-jour.md
contact: "Contacter le développeur" (both Compte tabs) calls CONTACT_PHONE through GET enterprise-contact, terms rows removed, spec docs/specs/aide-chauffeur.md
earnings: driver "Gains" tab and "Conduire" figures real (GET drivers/me/earnings, drivers/me/activity), spec docs/specs/gains-reels.md; screen spec docs/specs/gains-du-chauffeur.md
homeWork: passenger's "Maison" and "Travail" (passenger module, me/saved-places), spec docs/specs/maison-et-travail.md
recentDestinations: GET rides/recent-destinations (last 3 different, completed rides), spec docs/specs/destinations-recentes.md
passengerCount: 1 to 8 passengers chosen by the passenger, seats asked of the driver, supplement from the fifth in the estimate and at the end of the ride, coded not tested, spec docs/specs/nombre-de-passagers.md
ridesByPages: GET rides/booked and GET rides are paged (limit, page, { data, count, limit, page }), id as second sort, index on rides.passengerId, coded, waits for the migration, spec docs/specs/mes-courses-par-pages.md
driverBookingsByPages: GET bookings/available and bookings/accepted are paged the same way, coded, untested on a device, spec docs/specs/reservations-chauffeur-par-pages.md
next: to choose with the user; ideas and maintenance noted for later in docs/a-faire.md (among them the Prisma 7 to 8 upgrade, not before 8.0 is stable: prefs prismaVersion)
