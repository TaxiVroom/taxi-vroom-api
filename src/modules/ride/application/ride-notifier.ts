import { Inject, Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { addMinutes } from 'date-fns';
import { CommandProps } from '@libs/ddd';
import { SendPushCommand } from '@modules/notification/commands/send-push/send-push.command';
import { RideEntity } from '@modules/ride/domain/ride.entity';
import { PendingRideOffer } from '@modules/ride/domain/ride.types';
import { RideRepositoryPort } from '@modules/ride/database/ride.repository.port';
import { RIDE_REPOSITORY } from '@modules/ride/ride.di-tokens';

// An older message is no longer true: the ride moved on.
const rideNewsLifetimeMs = 10 * 60_000;

// News about a booking stays true until its departure, up to 30 days.
const bookingNewsLifetimeMs = 24 * 60 * 60_000;

// "mer. 4 nov. à 05:00", in French time whatever the server's time zone.
const pickupTimeFormat = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

// "05:00", in French time.
const clockFormat = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris',
  hour: '2-digit',
  minute: '2-digit',
});

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

  // 45 min before the pickup: online by the deadline, or the booking goes to
  // another taxi.
  async goOnlineReminder(ride: RideEntity, driverId: string): Promise<void> {
    const pickupAt = this.requiredPickupAt(ride);
    const deadline = addMinutes(
      pickupAt,
      -RideEntity.bookingDepartureLeadMinutes,
    );
    await this.toBookingDriver(
      driverId,
      'Réservation à venir',
      `Votre réservation de ${clockFormat.format(pickupAt)} : ` +
        `passez en ligne avant ${clockFormat.format(deadline)}.`,
    );
  }

  // At the deadline, the booking is theirs: they leave when they want, by
  // 10 min before the pickup.
  async leaveBy(ride: RideEntity, driverId: string): Promise<void> {
    const pickupAt = this.requiredPickupAt(ride);
    const latestDeparture = addMinutes(
      pickupAt,
      -RideEntity.bookingDepartureDeadlineMinutes,
    );
    await this.toBookingDriver(
      driverId,
      `Réservation de ${clockFormat.format(pickupAt)}`,
      `Appuyez sur « Je pars » avant ${clockFormat.format(latestDeparture)}.`,
    );
  }

  // The committed driver lost the booking: offline at the deadline, or not
  // left 10 min before the pickup.
  async bookingReassigned(ride: RideEntity, driverId: string): Promise<void> {
    const pickupAt = this.requiredPickupAt(ride);
    await this.toBookingDriver(
      driverId,
      'Réservation retirée',
      `Réservation de ${clockFormat.format(pickupAt)} confiée à un autre taxi.`,
    );
  }

  // With the ride's id: the passenger follows the search of another taxi.
  async committedDriverUnavailable(ride: RideEntity): Promise<void> {
    await this.toPassenger(
      ride,
      'Votre chauffeur n’est pas disponible',
      'Nous cherchons un autre taxi.',
    );
  }

  async bookingConfirmed(ride: RideEntity): Promise<void> {
    await this.toBookingPassenger(
      ride,
      'Réservation confirmée',
      `Un chauffeur viendra vous chercher ${this.pickupTime(ride)}.`,
    );
  }

  async bookingDriverWithdrew(ride: RideEntity): Promise<void> {
    await this.toBookingPassenger(
      ride,
      'Réservation : chauffeur désisté',
      `Nous cherchons un autre chauffeur pour ${this.pickupTime(ride)}.`,
    );
  }

  async bookingCancelled(ride: RideEntity, driverId: string): Promise<void> {
    await this.send({
      userId: driverId,
      title: 'Réservation annulée',
      body: `Le client a annulé la réservation ${this.pickupTime(ride)}.`,
      expiresInMs: bookingNewsLifetimeMs,
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

  // Its id lets the app open the ride at once: without a taxi around, the
  // search may be over before the app could ask for its current ride.
  async bookingStarted(ride: RideEntity): Promise<void> {
    await this.toPassenger(
      ride,
      'Votre réservation commence',
      'Nous cherchons votre taxi.',
    );
  }

  async driverWithdrew(ride: RideEntity): Promise<void> {
    await this.toPassenger(
      ride,
      'Nouveau chauffeur',
      'Nous cherchons un autre taxi.',
    );
  }

  // News of a ride going on, with its id: touching the notification opens
  // this ride.
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
      data: { rideId: ride.id },
    });
  }

  // News of a booking not started yet: no ride to follow yet, so no id, and
  // touching it opens the home.
  private async toBookingPassenger(
    ride: RideEntity,
    title: string,
    body: string,
  ): Promise<void> {
    await this.send({
      userId: ride.getProps().passengerId,
      title,
      body,
      expiresInMs: bookingNewsLifetimeMs,
    });
  }

  // News for the committed driver until they arrive: true for a few minutes.
  private async toBookingDriver(
    driverId: string,
    title: string,
    body: string,
  ): Promise<void> {
    await this.send({
      userId: driverId,
      title,
      body,
      expiresInMs: rideNewsLifetimeMs,
    });
  }

  // Only called for a booking, which always has one.
  private requiredPickupAt(ride: RideEntity): Date {
    const pickupAt = ride.schedule?.pickupAt;
    if (!pickupAt) throw new Error('Ride: a booking has its pickup time');
    return pickupAt;
  }

  // "du mer. 4 nov. à 05:00".
  private pickupTime(ride: RideEntity): string {
    const pickupAt = ride.schedule?.pickupAt;
    return pickupAt ? `du ${pickupTimeFormat.format(pickupAt)}` : '';
  }

  private async send(push: CommandProps<SendPushCommand>): Promise<void> {
    await this.commandBus.execute(new SendPushCommand(push));
  }
}
