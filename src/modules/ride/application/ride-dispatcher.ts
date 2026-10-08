import { Inject, Injectable } from '@nestjs/common';
import { ConflictException } from '@libs/exceptions';
import { RideEntity } from '@modules/ride/domain/ride.entity';
import { DriverCandidate } from '@modules/ride/domain/ride.types';
import { RideRepositoryPort } from '@modules/ride/database/ride.repository.port';
import { DRIVER_LOCATOR, RIDE_REPOSITORY } from '@modules/ride/ride.di-tokens';
import { DriverLocatorPort, OnlineDriver } from './ports/driver-locator.port';
import { RideOfferTimer } from './ride-offer-timer';
import { RidePublisher } from './ride-publisher';

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
  ) {}

  async offerToNextDriver(ride: RideEntity): Promise<void> {
    const { latitude, longitude } = ride.getProps().origin;
    const onlineDrivers = await this.driverLocator.findOnlineDriversAround(
      latitude,
      longitude,
      RideEntity.reachableRadiusMeters,
    );
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

  private async tryOffer(
    rideId: string,
    onlineDrivers: OnlineDriver[],
    takenByOtherRides: Set<string>,
  ): Promise<void> {
    let triedDriverId: string | undefined;
    try {
      const ride = await this.rideRepo.transaction(async () => {
        const locked = (
          await this.rideRepo.findOneByIdForUpdate(rideId)
        ).unwrap();
        const busy = await this.rideRepo.findBusyDriverIds(
          onlineDrivers.map((driver) => driver.driverId),
        );
        const candidates: DriverCandidate[] = onlineDrivers.map((driver) => ({
          ...driver,
          isBusy:
            busy.has(driver.driverId) || takenByOtherRides.has(driver.driverId),
        }));
        const offer = locked.offerToClosestDriver(candidates, new Date());
        if (offer.isErr()) return undefined;
        triedDriverId = locked.pendingOffer?.driverId;
        await this.rideRepo.save(locked);
        return locked;
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
      return;
    }
    await this.publisher.publishOffer(ride, offer);
    this.offerTimer.start(ride.id, offer.id);
  }
}
