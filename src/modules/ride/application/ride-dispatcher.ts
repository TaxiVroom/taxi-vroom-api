import { Inject, Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ConflictException } from '@libs/exceptions';
import { RideEntity } from '@modules/ride/domain/ride.entity';
import { DriverCandidate } from '@modules/ride/domain/ride.types';
import { RideRepositoryPort } from '@modules/ride/database/ride.repository.port';
import { DRIVER_LOCATOR, RIDE_REPOSITORY } from '@modules/ride/ride.di-tokens';
import { DriverLocatorPort, OnlineDriver } from './ports/driver-locator.port';
import { RideNotifier } from './ride-notifier';
import { RideOfferTimer } from './ride-offer-timer';
import { RidePublisher } from './ride-publisher';
import {
  DriverDocumentStatesReadModel,
  GetDriverDocumentStatesQuery,
} from '@modules/driver/queries/get-driver-document-states/get-driver-document-states.query-handler';

// When two rides pick the same driver at the same time, the database lets
// one through: the other one tries the next driver.
const maxAttempts = 3;

// Proposes a ride looking for a driver to the next closest one, or tells the
// passenger nobody is available. Used when the ride is requested, and after
// each refusal or expired offer.
@Injectable()
export class RideDispatcher {
  constructor(
    @Inject(RIDE_REPOSITORY) private readonly rideRepo: RideRepositoryPort,
    @Inject(DRIVER_LOCATOR) private readonly driverLocator: DriverLocatorPort,
    private readonly publisher: RidePublisher,
    private readonly offerTimer: RideOfferTimer,
    private readonly notifier: RideNotifier,
    private readonly queryBus: QueryBus,
  ) {}

  async offerToNextDriver(ride: RideEntity): Promise<void> {
    const { latitude, longitude } = ride.getProps().origin;
    const around = await this.driverLocator.findOnlineDriversAround(
      latitude,
      longitude,
      RideEntity.reachableRadiusMeters,
    );
    const onlineDrivers = await this.withoutBlockedDocuments(around);
    const takenByOtherRides = new Set<string>();
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await this.tryOffer(ride.id, onlineDrivers, takenByOtherRides);
      } catch (error) {
        if (!(error instanceof ConflictException) || attempt === maxAttempts) {
          throw error;
        }
      }
    }
  }

  // A document expired or missing: no ride offered, even if still shown
  // online. One read for all the candidates. Spec
  // docs/specs/documents-du-chauffeur.md, point 8.
  private async withoutBlockedDocuments(
    drivers: OnlineDriver[],
  ): Promise<OnlineDriver[]> {
    if (drivers.length === 0) return drivers;
    const states: DriverDocumentStatesReadModel[] = await this.queryBus.execute(
      new GetDriverDocumentStatesQuery({
        driverIds: drivers.map((driver) => driver.driverId),
      }),
    );
    const blocked = new Set(
      states.filter((state) => state.isBlocked).map((state) => state.driverId),
    );
    return drivers.filter((driver) => !blocked.has(driver.driverId));
  }

  private async tryOffer(
    rideId: string,
    onlineDrivers: OnlineDriver[],
    takenByOtherRides: Set<string>,
  ): Promise<void> {
    let triedDriverId: string | undefined;
    try {
      const ride = await this.rideRepo.transaction(async () => {
        const found = (await this.rideRepo.findOneById(rideId)).unwrap();
        const busy = await this.rideRepo.findBusyDriverIds(
          onlineDrivers.map((driver) => driver.driverId),
        );
        const candidates: DriverCandidate[] = onlineDrivers.map((driver) => ({
          ...driver,
          isBusy:
            busy.has(driver.driverId) || takenByOtherRides.has(driver.driverId),
        }));
        const offer = found.offerToClosestDriver(candidates, new Date());
        if (offer.isErr()) return undefined;
        triedDriverId = found.pendingOffer?.driverId;
        await this.rideRepo.save(found);
        return found;
      });
      if (ride) await this.announce(ride);
    } catch (error) {
      if (error instanceof ConflictException && triedDriverId) {
        takenByOtherRides.add(triedDriverId);
      }
      throw error;
    }
  }

  private async announce(ride: RideEntity): Promise<void> {
    const offer = ride.pendingOffer;
    if (!offer) {
      // Nobody left: the passenger learns no driver is available.
      await this.publisher.publishRide(ride);
      await this.notifier.noDriverFound(ride);
      return;
    }
    await this.publisher.publishOffer(ride, offer);
    this.offerTimer.start(ride.id, offer.id);
    await this.notifier.offerToDriver(ride, offer);
  }
}
