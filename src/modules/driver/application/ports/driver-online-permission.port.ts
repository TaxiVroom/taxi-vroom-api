// Whether a driver may be online, written in Firebase by the server only:
// the database rules accept the driver's presence only with it. Spec
// docs/specs/documents-du-chauffeur.md, point 8.
export interface DriverOnlinePermissionPort {
  allow(driverId: string): Promise<void>;
  // Also removes their presence: they are offline at once.
  revoke(driverIds: string[]): Promise<void>;
}
