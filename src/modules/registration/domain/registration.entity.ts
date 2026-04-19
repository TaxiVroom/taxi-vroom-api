import { AggregateRoot, AggregateID } from '@libs/ddd';
import {
  DriverRegistrationStep,
  PassengerRegistrationStep,
  RegistrationBaseProps,
  RegistrationRole,
  RegistrationStep,
  UpdateRegistrationBaseProps,
} from './registration.types';

export abstract class RegistrationEntity<
  T extends RegistrationBaseProps,
> extends AggregateRoot<T> {
  protected readonly _id: AggregateID;

  abstract get role(): RegistrationRole;
  abstract get currentStep(): RegistrationStep;

  abstract advanceStep(data: UpdateRegistrationBaseProps): void;

  abstract complete(): void;

  abstract validate(): void;
}
