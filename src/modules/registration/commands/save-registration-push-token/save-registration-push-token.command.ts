import { Command, CommandProps } from '@libs/ddd';

export class SaveRegistrationPushTokenCommand extends Command {
  readonly userId: string;
  readonly token: string;

  constructor(props: CommandProps<SaveRegistrationPushTokenCommand>) {
    super(props);
    this.userId = props.userId;
    this.token = props.token;
  }
}
