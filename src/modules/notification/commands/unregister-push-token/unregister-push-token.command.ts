import { Command, CommandProps } from '@libs/ddd';

export class UnregisterPushTokenCommand extends Command {
  readonly userId: string;

  constructor(props: CommandProps<UnregisterPushTokenCommand>) {
    super(props);
    this.userId = props.userId;
  }
}
