import { randomUUID } from 'crypto';
import { ArgumentInvalidException } from '@libs/exceptions';
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
  private static readonly NEXT_STEP: Record<
    DriverRegistrationStep,
    DriverRegistrationStep
  > = {
    [DriverRegistrationStep.SOCIAL_LINK]: DriverRegistrationStep.EMAIL,
    [DriverRegistrationStep.EMAIL]: DriverRegistrationStep.NAME,
    [DriverRegistrationStep.NAME]: DriverRegistrationStep.DOCUMENTS,
    [DriverRegistrationStep.DOCUMENTS]: DriverRegistrationStep.COMPLETE,
    [DriverRegistrationStep.COMPLETE]: DriverRegistrationStep.COMPLETE,
  };

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

  advanceStep(data: UpdateRegistrationBaseProps): void {
    if (data.email !== undefined) this.props.email = data.email;
    if (data.firstName !== undefined) this.props.firstName = data.firstName;
    if (data.lastName !== undefined) this.props.lastName = data.lastName;
    // Advance from the step the client declares it is completing, not from the
    // current DB step — makes PATCH idempotent on back-navigation.
    this.props.currentStep = DriverRegistrationEntity.NEXT_STEP[data.fromStep];
  }

  validate(): void {
    const currentStepIsDriverRegistrationStep: boolean = Object.values(
      DriverRegistrationStep,
    ).includes(this.props.currentStep);
    if (!currentStepIsDriverRegistrationStep)
      throw new ArgumentInvalidException('invalid driver registration step');
  }

  complete(): void {
    const p = this.props;
    if (!p.email || !p.firstName || !p.lastName || !p.phone) {
      throw new RegistrationNotCompleteError();
    }
    this.props.currentStep = DriverRegistrationStep.COMPLETE;
    this.addEvent(
      new RegistrationCompletedDomainEvent({
        aggregateId: this.id,
        email: p.email,
        phone: p.phone,
        firstName: p.firstName,
        lastName: p.lastName,
        role: p.role,
      }),
    );
  }
}
