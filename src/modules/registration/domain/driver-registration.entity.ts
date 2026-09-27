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
} from './registration.types';
import { RegistrationCompletedDomainEvent } from './events/registration-completed.domain-event';
import { RegistrationNotCompleteError } from './registration.errors';
import { RegistrationEntity } from './registration.entity';

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
    };
    return new DriverRegistrationEntity({ id, props });
  }

  get role(): RegistrationRole.driver {
    return this.props.role as RegistrationRole.driver;
  }

  get currentStep(): DriverRegistrationStep {
    return this.props.currentStep;
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
    this.props.currentStep = DriverRegistrationStep.DOCUMENTS;
  }

  private submitDocuments(): void {
    this.props.currentStep = DriverRegistrationStep.PENDING_REVIEW;
  }
}
