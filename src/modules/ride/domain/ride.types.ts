// Where a ride is in its life, from the estimate to its end.
export enum RideStatus {
  // The price is shown to the passenger, the ride is not ordered yet.
  estimated = 'ESTIMATED',
  searchingDriver = 'SEARCHING_DRIVER',
  noDriverFound = 'NO_DRIVER_FOUND',
  driverEnRoute = 'DRIVER_EN_ROUTE',
  driverArrived = 'DRIVER_ARRIVED',
  inProgress = 'IN_PROGRESS',
  completed = 'COMPLETED',
  cancelled = 'CANCELLED',
  passengerNoShow = 'PASSENGER_NO_SHOW',
}

// The code the passenger tells the driver at pickup, so the driver can start
// the ride.
export interface BoardingCode {
  code: string;
  // Wrong codes typed by the driver: starting is blocked at the limit.
  failedAttempts: number;
}

// A supplement added by the driver at the end of the ride, e.g. 2 bulky
// luggages.
export interface RideSupplement {
  supplementId: string;
  label: string;
  unitPriceCents: number;
  quantity: number;
}

// What the taxi's meter showed at the end, and the supplements.
export interface RideCompletion {
  completedAt: Date;
  meterCents: number;
  supplements: RideSupplement[];
}

// The current step of the ride, with only the data of that step: an
// impossible combination (no driver found, but a boarding code) cannot be
// written. The steps after the acceptance belong to the accepted offer.
export type RideStep =
  | { status: RideStatus.estimated }
  | { status: RideStatus.searchingDriver }
  | { status: RideStatus.noDriverFound; noDriverFoundAt: Date }
  | { status: RideStatus.driverEnRoute; boardingCode: BoardingCode }
  | {
      status: RideStatus.driverArrived;
      boardingCode: BoardingCode;
      arrivedAt: Date;
    }
  | { status: RideStatus.inProgress; arrivedAt: Date; startedAt: Date }
  | {
      status: RideStatus.completed;
      arrivedAt: Date;
      startedAt: Date;
      completion: RideCompletion;
    }
  | { status: RideStatus.cancelled; cancelledAt: Date }
  | { status: RideStatus.passengerNoShow; arrivedAt: Date; reportedAt: Date };

export enum RideOfferStatus {
  pending = 'PENDING',
  accepted = 'ACCEPTED',
  declined = 'DECLINED',
  expired = 'EXPIRED',
  withdrawn = 'WITHDRAWN',
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

// The driver gave the ride up after accepting it.
export interface WithdrawnRideOffer extends RideOfferBase {
  status: RideOfferStatus.withdrawn;
  acceptedAt: Date;
  withdrawnAt: Date;
}

// The ride proposed to one driver, with only the data of their answer.
export type RideOffer =
  | PendingRideOffer
  | AcceptedRideOffer
  | DeclinedRideOffer
  | ExpiredRideOffer
  | WithdrawnRideOffer;

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

// The public holidays calendar of a département: Alsace-Moselle has 2 more.
export enum HolidayZone {
  metropole = 'METROPOLE',
  alsaceMoselle = 'ALSACE_MOSELLE',
}

// The taxi tariffs of a département from a date on, from its prefectural
// arrêté.
export interface TaxiTariff {
  id: string;
  departmentCode: string;
  validFrom: Date;
  decree: string;
  pickupCents: number;
  // A by day, B by night, the taxi returning with a passenger; C by day, D
  // by night, the taxi returning empty.
  kmCents: { a: number; b: number; c: number; d: number };
  // Charged instead of the km price while the taxi is slow or stopped.
  hourlyCents: number;
  minimumFareCents: number;
  // Minutes since midnight, in French time. The night tariffs also apply all
  // day on Sundays and public holidays.
  nightStartMinute: number;
  nightEndMinute: number;
  holidayZone: HolidayZone;
}

// A stretch of road between two points of the route, timed with the traffic.
export interface RouteSegment {
  meters: number;
  seconds: number;
}

// The road of the closest free taxi to the pickup, then to the destination.
export interface TaxiRoute {
  approach: RouteSegment[];
  trip: RouteSegment[];
}

export interface RideProps {
  passengerId: string;
  origin: RidePickup;
  destination: RidePlace;
  estimatedPrice: EstimatedPrice;
  // The tariffs the estimate was computed with, as proof.
  tariffId: string;
  step: RideStep;
  // In the order they were made.
  offers: RideOffer[];
}

export interface EstimateRideProps {
  passengerId: string;
  origin: RidePickup;
  destination: RidePlace;
  tariff: TaxiTariff;
  route: TaxiRoute;
  // Days as "YYYY-MM-DD", in the département's calendar.
  publicHolidays: Set<string>;
  now: Date;
}

// A driver online around the pickup, as the realtime database sees them.
export interface DriverCandidate {
  driverId: string;
  latitude: number;
  longitude: number;
  // Already proposed another ride, or driving one.
  isBusy: boolean;
}
