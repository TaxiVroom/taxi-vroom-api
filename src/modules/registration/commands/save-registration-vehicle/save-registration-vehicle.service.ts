import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import { REGISTRATION_REPOSITORY } from '@modules/registration/registration.di-tokens';
import { RegistrationRepositoryPort } from '@modules/registration/database/registration.repository.port';
import { DriverRegistrationEntity } from '@modules/registration/domain/driver-registration.entity';
import {
  RegistrationAlreadyCompleteError,
  RegistrationNotDriverError,
  RegistrationNotFoundError,
  RegistrationVehicleLicenceTakenError,
  RegistrationVehiclePlateInvalidError,
  RegistrationVehiclePlateTakenError,
} from '@modules/registration/domain/registration.errors';
import { VehicleAvailability } from '@modules/registration/domain/registration.types';
import { CheckVehicleAvailabilityQuery } from '@modules/registration/queries/check-vehicle-availability/check-vehicle-availability.query-handler';
import { SaveRegistrationVehicleCommand } from './save-registration-vehicle.command';

export type SaveRegistrationVehicleError =
  | RegistrationNotFoundError
  | RegistrationNotDriverError
  | RegistrationAlreadyCompleteError
  | RegistrationVehiclePlateInvalidError
  | RegistrationVehiclePlateTakenError
  | RegistrationVehicleLicenceTakenError;

// "Votre taxi": the vehicle of the registration, replaced if given before.
// The step moves on with PATCH registration-flows/me, from VEHICLE.
@CommandHandler(SaveRegistrationVehicleCommand)
export class SaveRegistrationVehicleService implements ICommandHandler {
  constructor(
    @Inject(REGISTRATION_REPOSITORY)
    private readonly registrationRepo: RegistrationRepositoryPort,
    private readonly queryBus: QueryBus,
  ) {}

  async execute(
    command: SaveRegistrationVehicleCommand,
  ): Promise<Result<DriverRegistrationEntity, SaveRegistrationVehicleError>> {
    const found = await this.registrationRepo.findOneById(command.userId);
    if (found.isNone()) return Err(new RegistrationNotFoundError());
    const registration = found.unwrap();
    if (!(registration instanceof DriverRegistrationEntity)) {
      return Err(new RegistrationNotDriverError());
    }

    const saved = registration.saveVehicle({
      model: command.model,
      color: command.color,
      plate: command.plate,
      adsNumber: command.adsNumber,
      communeCode: command.communeCode,
      communeName: command.communeName,
      passengerSeats: command.passengerSeats,
    });
    if (saved.isErr()) return Err(saved.unwrapErr());
    const available = registration.confirmVehicleAvailable(
      await this.findAvailability(registration),
    );
    if (available.isErr()) return Err(available.unwrapErr());

    await this.registrationRepo.transaction(async () =>
      this.registrationRepo.update(registration),
    );
    return Ok(registration);
  }

  // Read with the plate as saved, e.g. "AB-123-CD" for "ab 123 cd".
  private async findAvailability(
    registration: DriverRegistrationEntity,
  ): Promise<VehicleAvailability> {
    const { vehicle } = registration.getProps();
    if (!vehicle) return { plateTaken: false, licenceTaken: false };
    return this.queryBus.execute(
      new CheckVehicleAvailabilityQuery({
        requestingUserId: registration.getProps().userId,
        plate: vehicle.plate,
        adsNumber: vehicle.adsNumber,
        communeCode: vehicle.communeCode,
      }),
    );
  }
}
