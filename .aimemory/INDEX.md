# aimemory
arch: confirmed hot modules/build
hyp: working hypotheses + concepts (revisable)
done: recent outcomes
prefs: feature workflow
ltm: durable cold graph, see ltm/CATALOG.md (do not bulk-load)
entry: src/main.ts → *.http.controller.ts → CommandBus → *.service.ts → domain/*.entity.ts → database/*.repository.ts → domain events
product: Uber-like app for French licensed taxis, backend authority for matching, pricing and history @ltm:product
priceEstimate: shipped and tested on two emulators; ride starts ESTIMATED, ordering moves it to SEARCHING_DRIVER @ltm:priceEstimate
ride: full ride works from estimate to completion, cancel, withdraw and no-show @ltm:rideLifecycle
registration: passenger and driver onboarding work; admin can only validate, not reject @ltm:registration
gaps: unprotected user routes, suspension, document rejection, no ride read route: see hyp
next: real rating and ride history, then push notifications, then advance bookings
