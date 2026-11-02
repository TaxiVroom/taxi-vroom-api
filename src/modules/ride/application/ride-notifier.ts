import { Inject, Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { SendPushCommand } from '@modules/notification/commands/send-push/send-push.command';
import { RideEntity } from '@modules/ride/domain/ride.entity';
import { PendingRideOffer } from '@modules/ride/domain/ride.types';
import { RideRepositoryPort } from '@modules/ride/database/ride.repository.port';
import { RIDE_REPOSITORY } from '@modules/ride/ride.di-tokens';

// An older message is no longer true: the ride moved on.
const rideNewsLifetimeMs = 10 * 60_000;

// Warns the people of a ride who may not be looking at the app. The ride
// itself is told through the realtime database.
@Injectable()
export class RideNotifier {
  constructor(
    private readonly commandBus: CommandBus,
    @Inject(RIDE_REPOSITORY) private readonly rideRepo: RideRepositoryPort,
  ) {}

  async offerToDriver(
    ride: RideEntity,
    offer: PendingRideOffer,
  ): Promise<void> {
    const { estimatedPrice, origin } = ride.getProps();
    const low = Math.floor(estimatedPrice.minCents / 100);
    const high = Math.ceil(estimatedPrice.maxCents / 100);
    await this.send({
      userId: offer.driverId,
      title: 'Nouvelle course',
      body: `${low}–${high} €, ${origin.name}`,
      expiresInMs: RideEntity.offerResponseTimeMs,
    });
  }

  async driverCancelled(driverId: string): Promise<void> {
    await this.send({
      userId: driverId,
      title: 'Course annulée',
      body: 'Le client a annulé la course.',
      expiresInMs: rideNewsLifetimeMs,
    });
  }

  async driverComing(ride: RideEntity): Promise<void> {
    const { driver } = await this.rideRepo.findParticipants(ride.id);
    const name = driver
      ? `${driver.firstName} ${driver.lastName[0]}.`
      : 'Votre chauffeur';
    await this.toPassenger(ride, 'Votre taxi arrive', `${name} est en route.`);
  }

  async driverArrived(ride: RideEntity): Promise<void> {
    await this.toPassenger(
      ride,
      'Votre taxi est là',
      'Votre chauffeur vous attend.',
    );
  }

  async noDriverFound(ride: RideEntity): Promise<void> {
    await this.toPassenger(
      ride,
      'Aucun taxi disponible',
      'Réessayez dans quelques minutes.',
    );
  }

  async driverWithdrew(ride: RideEntity): Promise<void> {
    await this.toPassenger(
      ride,
      'Nouveau chauffeur',
      'Nous cherchons un autre taxi.',
    );
  }

  private async toPassenger(
    ride: RideEntity,
    title: string,
    body: string,
  ): Promise<void> {
    await this.send({
      userId: ride.getProps().passengerId,
      title,
      body,
      expiresInMs: rideNewsLifetimeMs,
    });
  }

  private async send(push: {
    userId: string;
    title: string;
    body: string;
    expiresInMs: number;
  }): Promise<void> {
    await this.commandBus.execute(new SendPushCommand(push));
  }
}
