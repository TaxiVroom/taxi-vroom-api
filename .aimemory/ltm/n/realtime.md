# id: realtime
# tags: firebase,rtdb,realtime,drivers,offers,geohash
# sum: Firebase Realtime Database paths written and read by the API

#N id|kind|path|note
RealtimePort|port|src/modules/ride/application/ports/ride-realtime.port.ts|publishOffer, withdrawOffer, publishRide, markDriverBusy, markDriverAvailable
LocatorPort|port|src/modules/ride/application/ports/driver-locator.port.ts|findOnlineDriversAround

#F durable facts
drivers/<uid>: written by the driver app (latitude, longitude, geohash, available, updatedAt), removed on disconnect; the API only changes available, in a transaction so an offline driver stays offline
rideOffers/<driverId>: rideId, offeredAt, pickup, destination, estimated prices, passengerFirstName; removed once answered, expired or cancelled
rides/<rideId>: passengerId, driverId, status, pickup, destination, estimated prices, passenger, driver, completion, updatedAt; overwritten at each step by set()
passenger and driver objects hold firstName, lastName, phone; driver also holds rating (null without one) and completedRides
geo queries: geohashQueryBounds from geofire-common, one orderByChild('geohash') query per range; results may exceed the radius, the entity filters them
Firebase rules let each user read only their data; they live in the Firebase console, no rules file in this repo
FIREBASE_DATABASE_URL is required: the database is outside the US
