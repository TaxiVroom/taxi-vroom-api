import { Option } from 'oxide.ts';
import { RepositoryPort } from '@libs/ddd';
import { RideEntity } from '../domain/ride.entity';
import { TaxiTariff } from '../domain/ride.types';

export interface RidePerson {
  firstName: string;
  lastName: string;
  phone: string;
}

export interface RideDriverStats {
  // The average of all their ratings, null until they get one.
  rating: number | null;
  completedRides: number;
}

// What the passenger looks for to recognize the taxi. Spec
// docs/specs/vehicule-du-chauffeur.md.
export interface RideVehicle {
  // Make and model, e.g. "Renault Austral".
  model: string;
  // A VehicleColor value, e.g. "GREY".
  color: string;
  plate: string;
  // The "Taxi n° 118" of the commune de rattachement.
  adsNumber: string;
  communeName: string;
}

export interface RideDriver extends RidePerson, RideDriverStats {
  // Null for a driver registered before the "Votre taxi" step existed.
  vehicle: RideVehicle | null;
}

// Who takes part in a ride, to tell each one about the other.
export interface RideParticipants {
  passenger: RidePerson;
  // Once a driver accepted the ride.
  driver: RideDriver | null;
}

export interface RideRepositoryPort extends RepositoryPort<RideEntity> {
  // Writes the ride with all its sub-tables. Throws ConflictException when a
  // database constraint refuses it, e.g. a driver already proposed another
  // ride.
  save(ride: RideEntity): Promise<void>;

  // The rides whose pending offer was made before this time, all locked until
  // the end of the transaction: another server skips them. Call it inside a
  // transaction.
  lockRidesWithOverdueOffers(offeredBefore: Date): Promise<RideEntity[]>;

  // Among these drivers, those already proposed a ride, driving one, or
  // waiting to leave for their booking. exceptRideId: not counting that ride.
  findBusyDriverIds(
    driverIds: string[],
    exceptRideId?: string,
  ): Promise<Set<string>>;

  findParticipants(rideId: string): Promise<RideParticipants>;

  // The pickup times of the other bookings this driver committed to, which
  // they have not left for yet.
  findCommittedPickupTimes(
    driverId: string,
    exceptRideId: string,
  ): Promise<Date[]>;

  // The next booking due in leadMinutes or less, locked until the end of the
  // transaction: another server skips it. Call it inside a transaction.
  lockNextDueBooking(leadMinutes: number): Promise<Option<RideEntity>>;

  // The same, for the next booking due in leadMinutes or less whose
  // committed driver was not reminded to go online yet.
  lockNextBookingToRemind(leadMinutes: number): Promise<Option<RideEntity>>;

  // The same, for the next booking still assigned leadMinutes or less before
  // its pickup: its driver did not leave in time.
  lockNextBookingNotLeft(leadMinutes: number): Promise<Option<RideEntity>>;

  // The ride, locked until the end of the transaction; waits if another one
  // holds it. Call it inside a transaction.
  lockOneById(id: string): Promise<Option<RideEntity>>;

  // The tariffs in force in the département at that time: the latest arrêté
  // already valid. None where the app does not work yet.
  findTariff(departmentCode: string, at: Date): Promise<Option<TaxiTariff>>;

  // The supplement for each passenger from the fifth, in the tariff the ride
  // was estimated with.
  findExtraPassengerCents(rideId: string): Promise<number>;
}
