import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { DriverOnlinePermissionPort } from '@modules/driver/application/ports/driver-online-permission.port';

// onlineAllowed/<uid>, read by the Realtime Database rules before accepting
// drivers/<uid>. One multi-path update for all the drivers.
// https://firebase.google.com/docs/database/admin/save-data
@Injectable()
export class FirebaseDriverOnlinePermissionAdapter
  implements DriverOnlinePermissionPort
{
  async allow(driverId: string): Promise<void> {
    await admin.database().ref(`onlineAllowed/${driverId}`).set(true);
  }

  async revoke(driverIds: string[]): Promise<void> {
    if (driverIds.length === 0) return;
    const updates: Record<string, null> = {};
    for (const driverId of driverIds) {
      updates[`onlineAllowed/${driverId}`] = null;
      updates[`drivers/${driverId}`] = null;
    }
    await admin.database().ref().update(updates);
  }
}
