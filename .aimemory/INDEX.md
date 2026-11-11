# aimemory
arch: confirmed hot modules/build
hyp: working hypotheses + concepts (revisable)
done: recent outcomes
prefs: feature workflow
ltm: durable cold graph, see ltm/CATALOG.md (do not bulk-load)
specs: decisions of a feature live in docs/specs/<nom>.md, read the one matching the task
entry: src/main.ts → *.http.controller.ts → CommandBus → *.service.ts → domain/*.entity.ts → database/*.repository.ts → domain events
product: Ride-hailing app for French licensed taxis, backend authority for matching, pricing and history @ltm:product
priceEstimate: shipped and tested on two emulators; ride starts ESTIMATED, ordering moves it to SEARCHING_DRIVER @ltm:priceEstimate
ride: full ride works from estimate to completion, cancel, withdraw and no-show @ltm:rideLifecycle
registration: passenger and driver onboarding work, validated documents copied to documents, spec docs/specs/inscription-chauffeur.md; admin can only validate, not reject @ltm:registration
gaps: unprotected user routes, suspension, document rejection: see hyp
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
next: to choose with the user; ideas noted for later in docs/a-faire.md
