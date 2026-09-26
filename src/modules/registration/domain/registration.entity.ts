import { Result } from 'oxide.ts';
import { AggregateRoot, AggregateID } from '@libs/ddd';
import {
  DriverRegistrationStep,
  PassengerRegistrationStep,
  RegistrationBaseProps,
  RegistrationRole,
  RegistrationStep,
  UpdateRegistrationBaseProps,
} from './registration.types';
import { RegistrationNotCompleteError } from './registration.errors';

export abstract class RegistrationEntity<
  T extends RegistrationBaseProps,
> extends AggregateRoot<T> {
  protected readonly _id: AggregateID;

  abstract get role(): RegistrationRole;
  abstract get currentStep(): RegistrationStep;

  abstract advanceStep(data: UpdateRegistrationBaseProps): void;

  abstract complete(): Result<null, RegistrationNotCompleteError>;

  abstract validate(): void;
}
