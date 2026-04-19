import { Command, CommandProps } from '@libs/ddd';
import { UserRoles } from '@modules/user/domain/user.types';

export class CreateUserCommand extends Command {
  readonly email: string;

  readonly phone: string;

  readonly firstName: string;

  readonly lastName: string;

  readonly role: UserRoles;

  // readonly country: string;
  // readonly postalCode: string;
  // readonly street: string;

  constructor(props: CommandProps<CreateUserCommand>) {
    super(props);
    this.email = props.email;
    this.phone = props.phone;
    this.firstName = props.firstName;
    this.lastName = props.lastName;
    this.role = props.role;
    // this.country = props.country;
    // this.postalCode = props.postalCode;
    // this.street = props.street;
  }
}
