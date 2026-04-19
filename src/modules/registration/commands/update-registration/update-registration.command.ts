import { Command, CommandProps } from '@libs/ddd';
import { RegistrationStep } from '@modules/registration/domain/registration.types';

export class UpdateRegistrationCommand extends Command {
  readonly userId: string;
  readonly fromStep: RegistrationStep;
  readonly email?: string;
  readonly firstName?: string;
  readonly lastName?: string;

  constructor(props: CommandProps<UpdateRegistrationCommand>) {
    super(props);
    this.userId = props.userId;
    this.fromStep = props.fromStep;
    this.email = props.email;
    this.firstName = props.firstName;
    this.lastName = props.lastName;
  }
}
