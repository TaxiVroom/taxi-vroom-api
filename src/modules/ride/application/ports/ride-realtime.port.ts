import { RidePerson } from '@modules/ride/database/ride.repository.port';
import {
  EstimatedPrice,
  RidePickup,
  RidePlace,
  RideStatus,
} from '@modules/ride/domain/ride.types';

// What a driver sees of a ride proposed to them.
export interface RideOfferNotice {
  driverId: string;
  rideId: string;
  offeredAt: Date;
  pickup: RidePickup;
  destination: RidePlace;
  estimatedPrice: EstimatedPrice;
  passengerFirstName: string;
}

// What the passenger and their driver see of the ride.
export interface RideNotice {
  rideId: string;
  passengerId: string;
  status: RideStatus;
  pickup: RidePickup;
  destination: RidePlace;
  passenger: RidePerson;
  // Once a driver accepted the ride.
  driverId: string | null;
  driver: RidePerson | null;
}

// Tells the apps about rides as they happen: they listen to the realtime
// database, which only the server writes.
export interface RideRealtimePort {
  publishOffer(offer: RideOfferNotice): Promise<void>;

  // The driver no longer has to answer: they did, or the time is up.
  withdrawOffer(driverId: string): Promise<void>;

  publishRide(ride: RideNotice): Promise<void>;

  // Readable by the passenger only: the driver must hear it from them.
  publishBoardingCode(
    rideId: string,
    passengerId: string,
    code: string,
  ): Promise<void>;

  // Hides the driver from the free taxis shown to passengers.
  markDriverBusy(driverId: string): Promise<void>;
}
