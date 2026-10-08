import { Injectable } from '@nestjs/common';
import { getDatabase, ServerValue } from 'firebase-admin/database';
import {
  RideNotice,
  RideOfferNotice,
  RideRealtimePort,
} from '@modules/ride/application/ports/ride-realtime.port';

// The apps listen to these paths; the security rules let each one read only
// its own data:
// - rideOffers/<driverId>: the ride proposed to the driver
// - rides/<rideId>: the ride, for its passenger and its driver
// - rideBoardingCodes/<rideId>: the boarding code, for the passenger only
// Writes as in https://firebase.google.com/docs/database/admin/save-data
@Injectable()
export class FirebaseRideRealtimeAdapter implements RideRealtimePort {
  async publishOffer(offer: RideOfferNotice): Promise<void> {
    await getDatabase().ref(`rideOffers/${offer.driverId}`).set({
      rideId: offer.rideId,
      offeredAt: offer.offeredAt.getTime(),
      pickup: offer.pickup,
      destination: offer.destination,
      estimatedPriceMinCents: offer.estimatedPrice.minCents,
      estimatedPriceMaxCents: offer.estimatedPrice.maxCents,
      passengerFirstName: offer.passengerFirstName,
    });
  }

  async withdrawOffer(driverId: string): Promise<void> {
    // "Passing null will remove the data at the specified location."
    await getDatabase().ref(`rideOffers/${driverId}`).set(null);
  }

  async publishRide(ride: RideNotice): Promise<void> {
    await getDatabase().ref(`rides/${ride.rideId}`).set({
      passengerId: ride.passengerId,
      driverId: ride.driverId,
      status: ride.status,
      pickup: ride.pickup,
      destination: ride.destination,
      passenger: ride.passenger,
      driver: ride.driver,
      updatedAt: ServerValue.TIMESTAMP,
    });
  }

  async publishBoardingCode(
    rideId: string,
    passengerId: string,
    code: string,
  ): Promise<void> {
    await getDatabase()
      .ref(`rideBoardingCodes/${rideId}`)
      .set({ passengerId, code });
  }

  async markDriverBusy(driverId: string): Promise<void> {
    // A transaction, so the driver's entry is only changed if it exists: the
    // handler may first get null from the local cache, and is then called
    // again with the server's value.
    await getDatabase()
      .ref(`drivers/${driverId}`)
      .transaction((driver) =>
        driver === null ? null : { ...driver, available: false },
      );
  }
}
