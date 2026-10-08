// Where a ride is in its life, from the request to its end.
export enum RideStatus {
  searchingDriver = 'SEARCHING_DRIVER',
  noDriverFound = 'NO_DRIVER_FOUND',
  driverEnRoute = 'DRIVER_EN_ROUTE',
  driverArrived = 'DRIVER_ARRIVED',
  inProgress = 'IN_PROGRESS',
  completed = 'COMPLETED',
  cancelled = 'CANCELLED',
  passengerNoShow = 'PASSENGER_NO_SHOW',
}

// The current step of the ride, with only the data of that step: an
// impossible combination (no driver found, but a boarding code) cannot be
// written. The other statuses come with the rest of the ride.
export type RideStep =
  | { status: RideStatus.searchingDriver }
  | { status: RideStatus.noDriverFound; noDriverFoundAt: Date }
  | {
      status: RideStatus.driverEnRoute;
      // Hash of the code the passenger tells the driver at pickup: the code
      // itself is never stored.
      boardingCodeHash: string;
    };

export enum RideOfferStatus {
  pending = 'PENDING',
  accepted = 'ACCEPTED',
  declined = 'DECLINED',
  expired = 'EXPIRED',
}

interface RideOfferBase {
  id: string;
  driverId: string;
  offeredAt: Date;
}

export interface PendingRideOffer extends RideOfferBase {
  status: RideOfferStatus.pending;
}

export interface AcceptedRideOffer extends RideOfferBase {
  status: RideOfferStatus.accepted;
  acceptedAt: Date;
}

export interface DeclinedRideOffer extends RideOfferBase {
  status: RideOfferStatus.declined;
  declinedAt: Date;
}

export interface ExpiredRideOffer extends RideOfferBase {
  status: RideOfferStatus.expired;
  expiredAt: Date;
}

// The ride proposed to one driver, with only the data of their answer.
export type RideOffer =
  | PendingRideOffer
  | AcceptedRideOffer
  | DeclinedRideOffer
  | ExpiredRideOffer;

export interface RidePlace {
  name: string;
  latitude: number;
  longitude: number;
}

// Where the passenger is picked up: the passenger's position, unnamed until
// its address is looked up.
export interface RidePickup {
  name: string | null;
  latitude: number;
  longitude: number;
}

// The estimate shown to the passenger when ordering: a taxi runs on its
// meter, the real price is only known on arrival.
export interface EstimatedPrice {
  minCents: number;
  maxCents: number;
}

export interface RideProps {
  passengerId: string;
  origin: RidePickup;
  destination: RidePlace;
  estimatedPrice: EstimatedPrice;
  step: RideStep;
  // In the order they were made.
  offers: RideOffer[];
}

export interface CreateRideProps {
  passengerId: string;
  origin: RidePickup;
  destination: RidePlace;
  estimatedPrice: EstimatedPrice;
}

// A driver online around the pickup, as the realtime database sees them.
export interface DriverCandidate {
  driverId: string;
  latitude: number;
  longitude: number;
  // Already proposed another ride, or driving one.
  isBusy: boolean;
}
