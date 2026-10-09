import { RepositoryPort } from '@libs/ddd';
import { RideEntity } from '../domain/ride.entity';

export interface RidePerson {
  firstName: string;
  lastName: string;
  phone: string;
}

// Who takes part in a ride, to tell each one about the other.
export interface RideParticipants {
  passenger: RidePerson;
  // Once a driver accepted the ride.
  driver: RidePerson | null;
}

export interface RideRepositoryPort extends RepositoryPort<RideEntity> {
  // Writes the ride with all its sub-tables. Throws ConflictException when a
  // database constraint refuses it, e.g. a driver already proposed another
  // ride.
  save(ride: RideEntity): Promise<void>;

  // Among these drivers, those already proposed a ride or driving one.
  findBusyDriverIds(driverIds: string[]): Promise<Set<string>>;

  findParticipants(rideId: string): Promise<RideParticipants>;
}
