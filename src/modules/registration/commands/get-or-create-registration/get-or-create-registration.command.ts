import { Command, CommandProps } from '@libs/ddd';
import { RegistrationRole } from '@modules/registration/domain/registration.types';

export class GetOrCreateRegistrationCommand extends Command {
  readonly userId: string;
  readonly role: RegistrationRole;
  readonly phone: string;

  constructor(props: CommandProps<GetOrCreateRegistrationCommand>) {
    super(props);
    this.userId = props.userId;
    this.role = props.role;
    this.phone = props.phone;
  }
}
