import { Command, CommandProps } from '@libs/ddd';

export class RegisterPushTokenCommand extends Command {
  readonly userId: string;
  readonly token: string;

  constructor(props: CommandProps<RegisterPushTokenCommand>) {
    super(props);
    this.userId = props.userId;
    this.token = props.token;
  }
}
