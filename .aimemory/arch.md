#N id|kind|path|note
RideModule|mod|src/modules/ride/|ride lifecycle, dispatch, estimate; ports in application/ports, adapters in infrastructure
RideEntity|agg|src/modules/ride/domain/ride.entity.ts|estimate, request, approachingDriver, closest free driver rule shared by estimate and dispatch
TaxiFare|mod|src/modules/ride/domain/taxi-fare.ts|estimateFare, isTariffOutdated

#E from>rel>to
RideEntity>uses>TaxiFare

#B key=value
stack=NestJS+Prisma7+Postgres+CQRS+DDD+FirebaseAdmin+MapboxDirections
migrationFlow=migration:dev then prisma:generate; a data insert needs --create-only then a hand edit
seed=reset does not seed since Prisma 7; run db:seed, it fills document_types
adminValidation=PATCH /v1/admin/registration-documents/:documentId/validate needs any Firebase token, no admin role yet (TODO in controller)
releaseTodo=before the first staging/prod release, create a dedicated server Mapbox token: MAPBOX_ACCESS_TOKEN is the default public one since 2026-10-21 because a new token asked for a payment method, and the default one cannot be deleted

# stub for LTM overflow
#N product|@ltm|ltm:product|Uber-like for French taxis; realtime and supply decisions
#N priceEstimate|@ltm|ltm:priceEstimate|validated estimate design, formula, Bas-Rhin tariff
