import { Injectable } from '@nestjs/common';
import { getDatabase } from 'firebase-admin/database';
import { geohashQueryBounds } from 'geofire-common';
import {
  DriverLocatorPort,
  OnlineDriver,
} from '@modules/ride/application/ports/driver-locator.port';

// The driver app writes drivers/<uid> while online, with a geohash. One
// query per geohash range around the point, as in
// https://firebase.google.com/docs/firestore/solutions/geoqueries ("the same
// approach works for Realtime Database") and
// https://firebase.google.com/docs/database/admin/retrieve-data
@Injectable()
export class FirebaseDriverLocatorAdapter implements DriverLocatorPort {
  async findOnlineDriversAround(
    latitude: number,
    longitude: number,
    radiusMeters: number,
  ): Promise<OnlineDriver[]> {
    const drivers = getDatabase().ref('drivers');
    const bounds = geohashQueryBounds([latitude, longitude], radiusMeters);
    const snapshots = await Promise.all(
      bounds.map(([start, end]) =>
        drivers.orderByChild('geohash').startAt(start).endAt(end).once('value'),
      ),
    );

    const found: OnlineDriver[] = [];
    for (const snapshot of snapshots) {
      snapshot.forEach((driver) => {
        const value = driver.val();
        found.push({
          driverId: driver.key as string,
          latitude: value.latitude,
          longitude: value.longitude,
        });
      });
    }
    return found;
  }
}
