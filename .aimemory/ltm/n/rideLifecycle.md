# id: rideLifecycle
# tags: ride,dispatch,offer,boarding-code,no-show,cancel,withdraw,driver,passenger
# sum: Ride statuses, offers, dispatch, who can do what, limits

#N id|kind|path|note
RideTypes|mod|src/modules/ride/domain/ride.types.ts|RideStep and RideOffer are discriminated unions: an impossible combination cannot be written
RideRepo|repo|src/modules/ride/database/ride.repository.ts|save() upserts the ride then each sub-table; findBusyDriverIds; findParticipants; findTariff
RideErrors|mod|src/modules/ride/domain/ride.errors.ts|one class per RIDE.* code
BoardingCodeQuery|uc|src/modules/ride/queries/get-boarding-code/get-boarding-code.query-handler.ts|passenger only, by ride and passengerId

#E from>rel>to
RideRepo>persists>RideTypes

#F durable facts
limits: reachable radius 5000 m, offer answer 15 s, estimate valid 5 min, 5 boarding code attempts, no-show after 5 min at the pickup
roles: passenger estimates, orders, cancels, reads the boarding code; driver accepts, declines, arrives, starts, completes, withdraws, reports a no-show
cancel: passenger only, from SEARCHING_DRIVER, DRIVER_EN_ROUTE or DRIVER_ARRIVED, for good; a pending offer becomes EXPIRED; not possible from ESTIMATED or IN_PROGRESS
withdraw: driver only, from DRIVER_EN_ROUTE or DRIVER_ARRIVED; ride returns to SEARCHING_DRIVER and goes to the next driver, never to them again
dispatch: one driver at a time; candidates = online around the pickup, not busy, within 5 km, never asked on this ride; closest by straight line; none left gives NO_DRIVER_FOUND
busy = a PENDING offer, or an ACCEPTED offer on an active ride; read from Postgres, not from Firebase
race: partial unique indexes allow one PENDING offer per ride and per driver; a conflict tries the next driver, 3 attempts
offer ends: accept, decline, expire (timer) or cancel; each stops the timer and removes rideOffers/<driver>
accept: 4-digit code from randomInt, stored in plaintext in ride_boarding_codes, removed once the ride starts; the driver never reads it, they hear it from the passenger
boarding code in plaintext is deliberate: the earlier hashed design was dropped, the code never goes through Firebase, only the API gives it to the passenger
start: only from DRIVER_ARRIVED; a wrong code is counted and saved even though the call fails; locked at 5, then the driver calls the passenger or withdraws
complete: driver sends meterCents (legal price, typed from the taxi meter) and supplements; totalCents = meter + supplements; payment happens on board, outside the app
driver state: markDriverBusy on accept; markDriverAvailable on cancel, withdraw, no-show and complete
validate(): one pending offer at most, none before ordering, pending only while searching, exactly one accepted offer while a driver has the ride
writes go through a repository transaction, then Firebase publish happens after commit, outside the transaction
the expiry timer runs outside any HTTP request, so it opens its own RequestContext
estimate uses the closest free driver for the approach price; dispatch may end up on another driver, the price stays
