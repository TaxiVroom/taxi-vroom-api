import { randomUUID } from 'crypto';
import { Err, Ok, Result } from 'oxide.ts';
import {
  ArgumentInvalidException,
  ArgumentNotProvidedException,
} from '@libs/exceptions';
import {
  CreateDriverRegistrationProps,
  UpdateRegistrationBaseProps,
  DriverRegistrationStep,
  DriverRegistrationProps,
  RegistrationRole,
  RegistrationVehicle,
  VehicleAvailability,
} from './registration.types';
import { RegistrationCompletedDomainEvent } from './events/registration-completed.domain-event';
import {
  RegistrationAlreadyCompleteError,
  RegistrationNotCompleteError,
  RegistrationVehicleLicenceTakenError,
  RegistrationVehiclePlateInvalidError,
  RegistrationVehiclePlateTakenError,
} from './registration.errors';
import { RegistrationEntity } from './registration.entity';

// The current French plates (SIV): two letters, three digits, two letters.
const plateLettersAndDigits = /^([A-Z]{2})(\d{3})([A-Z]{2})$/;

export class DriverRegistrationEntity extends RegistrationEntity<DriverRegistrationProps> {
  static create(
    create: CreateDriverRegistrationProps,
  ): DriverRegistrationEntity {
    const id = randomUUID();
    const props: DriverRegistrationProps = {
      ...create,
      email: null,
      firstName: null,
      lastName: null,
      currentStep: DriverRegistrationStep.SOCIAL_LINK,
      vehicle: null,
    };
    return new DriverRegistrationEntity({ id, props });
  }

  get role(): RegistrationRole.driver {
    return this.props.role as RegistrationRole.driver;
  }

  get currentStep(): DriverRegistrationStep {
    return this.props.currentStep;
  }

  get vehicle(): RegistrationVehicle | null {
    return this.props.vehicle;
  }

  // "Votre taxi": replaces the vehicle given before, until the registration
  // is complete. The plate is kept as "AB-123-CD", whatever the spaces,
  // dashes or case typed.
  saveVehicle(
    vehicle: RegistrationVehicle,
  ): Result<
    null,
    RegistrationAlreadyCompleteError | RegistrationVehiclePlateInvalidError
  > {
    if (this.props.currentStep === DriverRegistrationStep.COMPLETE) {
      return Err(new RegistrationAlreadyCompleteError());
    }
    const plate = DriverRegistrationEntity.formatPlate(vehicle.plate);
    if (!plate) return Err(new RegistrationVehiclePlateInvalidError());
    this.props.vehicle = {
      model: vehicle.model.trim(),
      color: vehicle.color,
      plate,
      adsNumber: vehicle.adsNumber.trim(),
      communeCode: vehicle.communeCode,
      communeName: vehicle.communeName.trim(),
    };
    return Ok(null);
  }

  // The saved vehicle is refused when another driver or registration already
  // has its plate, or its taxi number in its commune: two taxis never share
  // them. Spec docs/specs/vehicule-du-chauffeur.md, point 7.
  confirmVehicleAvailable(
    availability: VehicleAvailability,
  ): Result<
    null,
    RegistrationVehiclePlateTakenError | RegistrationVehicleLicenceTakenError
  > {
    if (availability.plateTaken) {
      return Err(new RegistrationVehiclePlateTakenError());
    }
    if (availability.licenceTaken) {
      return Err(new RegistrationVehicleLicenceTakenError());
    }
    return Ok(null);
  }

  private static formatPlate(typed: string): string | null {
    const compact = typed.toUpperCase().replace(/[\s-]/g, '');
    const parts = plateLettersAndDigits.exec(compact);
    if (!parts) return null;
    return `${parts[1]}-${parts[2]}-${parts[3]}`;
  }

  // Advance from the step the client declares it is completing, not from the
  // current DB step — makes PATCH idempotent on back-navigation.
  advanceStep(data: UpdateRegistrationBaseProps): void {
    switch (data.fromStep) {
      case DriverRegistrationStep.SOCIAL_LINK:
        this.linkSocialAccount();
        break;
      case DriverRegistrationStep.EMAIL:
        this.saveEmail(data.email);
        break;
      case DriverRegistrationStep.NAME:
        this.saveName(data.firstName, data.lastName);
        break;
      case DriverRegistrationStep.VEHICLE:
        this.confirmVehicle();
        break;
      case DriverRegistrationStep.DOCUMENTS:
      case DriverRegistrationStep.DOCUMENTS_CORRECTION:
        this.submitDocuments();
        break;
      default:
        throw new ArgumentInvalidException(
          `transition non autorisée depuis ${data.fromStep}`,
        );
    }
  }

  validate(): void {
    const currentStepIsDriverRegistrationStep: boolean = Object.values(
      DriverRegistrationStep,
    ).includes(this.props.currentStep);
    if (!currentStepIsDriverRegistrationStep)
      throw new ArgumentInvalidException('invalid driver registration step');
  }

  complete(): Result<null, RegistrationNotCompleteError> {
    // Already finalized: completing again must not create the user twice.
    if (this.props.currentStep === DriverRegistrationStep.COMPLETE) {
      return Ok(null);
    }
    const p = this.props;
    if (!p.email || !p.firstName || !p.lastName || !p.phone) {
      return Err(new RegistrationNotCompleteError());
    }
    this.props.currentStep = DriverRegistrationStep.COMPLETE;
    this.addEvent(
      new RegistrationCompletedDomainEvent({
        aggregateId: p.userId, // Firebase UID = id of the created user
        email: p.email,
        phone: p.phone,
        firstName: p.firstName,
        lastName: p.lastName,
        role: p.role,
      }),
    );
    return Ok(null);
  }

  requireCorrections(): void {
    this.props.currentStep = DriverRegistrationStep.DOCUMENTS_CORRECTION;
  }

  private linkSocialAccount(): void {
    this.props.currentStep = DriverRegistrationStep.EMAIL;
  }

  private saveEmail(email: string | undefined): void {
    if (!email) throw new ArgumentNotProvidedException('email requis');
    this.props.email = email;
    this.props.currentStep = DriverRegistrationStep.NAME;
  }

  private saveName(
    firstName: string | undefined,
    lastName: string | undefined,
  ): void {
    if (!firstName || !lastName)
      throw new ArgumentNotProvidedException('firstName et lastName requis');
    this.props.firstName = firstName;
    this.props.lastName = lastName;
    this.props.currentStep = DriverRegistrationStep.VEHICLE;
  }

  // The vehicle is saved by saveVehicle; the documents come next.
  private confirmVehicle(): void {
    if (!this.props.vehicle)
      throw new ArgumentNotProvidedException('véhicule requis');
    this.props.currentStep = DriverRegistrationStep.DOCUMENTS;
  }

  private submitDocuments(): void {
    this.props.currentStep = DriverRegistrationStep.PENDING_REVIEW;
  }
}
