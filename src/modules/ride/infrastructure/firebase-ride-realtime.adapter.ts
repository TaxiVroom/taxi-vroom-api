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
// Writes as in https://firebase.google.com/docs/database/admin/save-data
@Injectable()
export class FirebaseRideRealtimeAdapter implements RideRealtimePort {
  async publishOffer(offer: RideOfferNotice): Promise<void> {
    await getDatabase()
      .ref(`rideOffers/${offer.driverId}`)
      .set({
        rideId: offer.rideId,
        offeredAt: offer.offeredAt.getTime(),
        pickup: offer.pickup,
        destination: offer.destination,
        estimatedPriceMinCents: offer.estimatedPrice.minCents,
        estimatedPriceMaxCents: offer.estimatedPrice.maxCents,
        passengerFirstName: offer.passengerFirstName,
        passengerCount: offer.passengerCount,
        kind: offer.kind,
        // Absent for a ride now: the database keeps no null.
        ...(offer.pickupAt && { pickupAt: offer.pickupAt.getTime() }),
      });
  }

  async withdrawOffer(driverId: string): Promise<void> {
    // "Passing null will remove the data at the specified location."
    await getDatabase().ref(`rideOffers/${driverId}`).set(null);
  }

  async publishRide(ride: RideNotice): Promise<void> {
    await getDatabase()
      .ref(`rides/${ride.rideId}`)
      .set({
        passengerId: ride.passengerId,
        driverId: ride.driverId,
        status: ride.status,
        pickup: ride.pickup,
        destination: ride.destination,
        estimatedPriceMinCents: ride.estimatedPrice.minCents,
        estimatedPriceMaxCents: ride.estimatedPrice.maxCents,
        passenger: ride.passenger,
        driver: ride.driver,
        completion: ride.completion && {
          completedAt: ride.completion.completedAt.getTime(),
          meterCents: ride.completion.meterCents,
          supplements: ride.completion.supplements.map((s) => ({
            label: s.label,
            unitPriceCents: s.unitPriceCents,
            quantity: s.quantity,
          })),
          totalCents: ride.completion.totalCents,
        },
        updatedAt: ServerValue.TIMESTAMP,
      });
  }

  async markDriverBusy(driverId: string): Promise<void> {
    await this.setDriverAvailable(driverId, false);
  }

  async markDriverAvailable(driverId: string): Promise<void> {
    await this.setDriverAvailable(driverId, true);
  }

  private async setDriverAvailable(
    driverId: string,
    available: boolean,
  ): Promise<void> {
    // A transaction, so the driver's entry is only changed if it exists (a
    // driver offline stays offline): the handler may first get null from the
    // local cache, and is then called again with the server's value.
    await getDatabase()
      .ref(`drivers/${driverId}`)
      .transaction((driver) =>
        driver === null ? null : { ...driver, available },
      );
  }
}
