# id: priceEstimate
# tags: price,tariff,estimate,ride,mapbox,legal
# sum: Validated estimate design: official meter formula, Bas-Rhin tariff, ESTIMATED status, tariffId

#N id|kind|path|note
EstimateRoute|svc|src/modules/ride/commands/estimate-ride/|POST /v1/rides creates the ride as ESTIMATED
RequestRoute|svc|src/modules/ride/commands/request-ride/|POST /v1/rides/:rideId/request, refused after 5 min with RIDE.ESTIMATE_EXPIRED
TaxiTariffTable|db|prisma TaxiTariff|one row per arrêté, unique (departmentCode, validFrom)
MapboxAdapter|svc|src/modules/ride/infrastructure/mapbox-route-planner.adapter.ts|driving-traffic, 3 coordinates, legs[0] approach, legs[1] trip
GeoApiAdapter|svc|src/modules/ride/infrastructure/geo-api-territory.adapter.ts|département from geo.api.gouv.fr, [] outside France
HolidaysAdapter|svc|src/modules/ride/infrastructure/calendrier-api-public-holidays.adapter.ts|calendrier.api.gouv.fr with in-memory cache

#F durable facts
why: the user fears complaints about estimate vs final price; legal basis L121-2 code de la consommation
one estimate only, shown when ordering as a range, never recomputed after driver assignment
no RideRequest sub-table (user refused it); prices stay in the rides columns
rides.tariffId → taxi_tariffs.id proves the tariff used; deriving it from createdAt would be falsified by an arrêté entered late
a warning is logged when the tariff used is older than 12 months, because the yearly update can be forgotten
formula: per Mapbox segment max(km price, time price), mode S of the arrêté du 9 juin 2016 annexe IX, plus pickup charge, then minimum fare; low floored and high ceiled to 0,10 €
range: low = A by day, B by night; high = C by day, D by night; each segment at the hour the taxi passes it
night: 19h–7h Europe/Paris, all day on Sundays and public holidays
approach billed at A/B from the closest free taxi; none within 5 km gives RIDE.NO_DRIVER_AVAILABLE
no luggage notion at all since 2026-11-13 (user decision); the passengers are asked (1 to 8) and 4 € (tariff.extraPassengerCents) per passenger from the fifth is added after the minimum fare, spec docs/specs/nombre-de-passagers.md
no national-cap fallback: unknown département gives RIDE.AREA_NOT_SERVED
only the "Taxi" offer for now
Bas-Rhin 2026: arrêté du 26 janvier 2026, validFrom 2026-02-01, pickup 310, km A 101 B 143 C 202 D 286, hourly 3780, minimum 800, night 1140 to 420, ALSACE_MOSELLE
the range is wide by design: C is twice A, so 19,6 km gives about 20 € of gap
the tariff row is inserted by hand in SQL, not by a migration: redo it after a reset, and give it extraPassengerCents = 400 (the column has no default; the migration of 2026-11-13 only filled the existing row)
