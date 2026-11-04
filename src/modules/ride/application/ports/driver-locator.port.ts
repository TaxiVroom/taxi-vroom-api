import { Option } from 'oxide.ts';

// A driver online, at the last position their app sent.
export interface OnlineDriver {
  driverId: string;
  latitude: number;
  longitude: number;
}

export interface DriverLocatorPort {
  // The drivers online around a point. May also return a few drivers a bit
  // further than the radius: the ride keeps only those within reach.
  findOnlineDriversAround(
    latitude: number,
    longitude: number,
    radiusMeters: number,
  ): Promise<OnlineDriver[]>;

  // This driver, if online, at their last position.
  findOnlineDriver(driverId: string): Promise<Option<OnlineDriver>>;
}
