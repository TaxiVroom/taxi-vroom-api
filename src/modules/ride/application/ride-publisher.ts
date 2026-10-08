import { Inject, Injectable } from '@nestjs/common';
import { RideEntity } from '@modules/ride/domain/ride.entity';
import { PendingRideOffer } from '@modules/ride/domain/ride.types';
import { RideRepositoryPort } from '@modules/ride/database/ride.repository.port';
import { RIDE_REALTIME, RIDE_REPOSITORY } from '@modules/ride/ride.di-tokens';
import { RideRealtimePort } from './ports/ride-realtime.port';

// Tells the passenger and the drivers about a ride, once it is saved.
@Injectable()
export class RidePublisher {
  constructor(
    @Inject(RIDE_REPOSITORY) private readonly rideRepo: RideRepositoryPort,
    @Inject(RIDE_REALTIME) private readonly realtime: RideRealtimePort,
  ) {}

  async publishRide(ride: RideEntity): Promise<void> {
    const participants = await this.rideRepo.findParticipants(ride.id);
    const props = ride.getProps();
    await this.realtime.publishRide({
      rideId: ride.id,
      passengerId: props.passengerId,
      status: ride.status,
      pickup: props.origin,
      destination: props.destination,
      passenger: participants.passenger,
      driverId: ride.driverId ?? null,
      driver: participants.driver,
    });
  }

  async publishOffer(ride: RideEntity, offer: PendingRideOffer): Promise<void> {
    const participants = await this.rideRepo.findParticipants(ride.id);
    const props = ride.getProps();
    await this.realtime.publishOffer({
      driverId: offer.driverId,
      rideId: ride.id,
      offeredAt: offer.offeredAt,
      pickup: props.origin,
      destination: props.destination,
      estimatedPrice: props.estimatedPrice,
      passengerFirstName: participants.passenger.firstName,
    });
  }
}
