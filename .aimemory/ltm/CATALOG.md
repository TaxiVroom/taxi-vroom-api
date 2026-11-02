#K id|tags|sum|refs
product|product,realtime,firebase,supply,drivers|Uber-like for French taxis; Firebase RTDB for live positions, backend authority; own driver fleet|docs none
priceEstimate|price,tariff,estimate,ride,mapbox,legal|Validated estimate design: official meter formula, Bas-Rhin tariff, ESTIMATED status, tariffId|src/modules/ride/domain/taxi-fare.ts,src/modules/ride/commands/estimate-ride/
rideLifecycle|ride,dispatch,offer,boarding-code,no-show,cancel,withdraw,driver,passenger|Ride statuses, offers, dispatch, who can do what, limits|src/modules/ride/domain/ride.entity.ts,src/modules/ride/application/
realtime|firebase,rtdb,realtime,drivers,offers,geohash|Firebase Realtime Database paths written and read by the API|src/modules/ride/infrastructure/
registration|registration,onboarding,documents,driver,passenger,storage,user|Onboarding steps, documents, user creation chain|src/modules/registration/
platform|auth,firebase,guards,roles,transactions,events,prisma,schema,libs|Auth, guards, transactions, events, data model map|src/modules/auth/,src/libs/,prisma/schema.prisma
