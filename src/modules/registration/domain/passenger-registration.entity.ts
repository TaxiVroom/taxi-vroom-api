import { randomUUID } from 'crypto';
import { Err, Ok, Result } from 'oxide.ts';
import { ArgumentInvalidException } from '@libs/exceptions';
import {
  RegistrationBaseProps,
  CreatePassengerRegistrationProps,
  UpdateRegistrationBaseProps,
  PassengerRegistrationStep,
  RegistrationRole,
} from './registration.types';
import { RegistrationCompletedDomainEvent } from './events/registration-completed.domain-event';
import { RegistrationNotCompleteError } from './registration.errors';
import { RegistrationEntity } from './registration.entity';

export interface PassengerRegistrationProps extends RegistrationBaseProps {
  currentStep: PassengerRegistrationStep;
}

export class PassengerRegistrationEntity extends RegistrationEntity<PassengerRegistrationProps> {
  private static readonly NEXT_STEP: Record<string, PassengerRegistrationStep> =
    {
      [PassengerRegistrationStep.SOCIAL_LINK]: PassengerRegistrationStep.EMAIL,
      [PassengerRegistrationStep.EMAIL]: PassengerRegistrationStep.NAME,
      [PassengerRegistrationStep.NAME]: PassengerRegistrationStep.NOTIFICATIONS,
      [PassengerRegistrationStep.NOTIFICATIONS]:
        PassengerRegistrationStep.COMPLETE,
      [PassengerRegistrationStep.COMPLETE]: PassengerRegistrationStep.COMPLETE,
    };

  static create(
    create: CreatePassengerRegistrationProps,
  ): PassengerRegistrationEntity {
    const id = randomUUID();
    const props: PassengerRegistrationProps = {
      ...create,
      email: null,
      firstName: null,
      lastName: null,
      currentStep: PassengerRegistrationStep.SOCIAL_LINK,
    };
    return new PassengerRegistrationEntity({ id, props });
  }

  get role(): RegistrationRole.passenger {
    return this.props.role as RegistrationRole.passenger;
  }

  get currentStep(): PassengerRegistrationStep {
    return this.props.currentStep;
  }

  advanceStep(data: UpdateRegistrationBaseProps): void {
    if (data.email !== undefined) this.props.email = data.email;
    if (data.firstName !== undefined) this.props.firstName = data.firstName;
    if (data.lastName !== undefined) this.props.lastName = data.lastName;
    // Advance from the step the client declares it is completing, not from the
    // current DB step — makes PATCH idempotent on back-navigation.
    this.props.currentStep =
      PassengerRegistrationEntity.NEXT_STEP[data.fromStep];
  }

  validate(): void {
    if (
      !Object.values(PassengerRegistrationStep).includes(this.props.currentStep)
    ) {
      throw new ArgumentInvalidException('invalid passenger registration step');
    }
  }

  complete(): Result<null, RegistrationNotCompleteError> {
    const p = this.props;
    if (!p.email || !p.firstName || !p.lastName || !p.phone) {
      return Err(new RegistrationNotCompleteError());
    }
    this.props.currentStep = PassengerRegistrationStep.COMPLETE;
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
}
