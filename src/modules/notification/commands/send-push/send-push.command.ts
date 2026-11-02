import { Command, CommandProps } from '@libs/ddd';

export class SendPushCommand extends Command {
  readonly userId: string;
  readonly title: string;
  readonly body: string;
  readonly expiresInMs: number;

  constructor(props: CommandProps<SendPushCommand>) {
    super(props);
    this.userId = props.userId;
    this.title = props.title;
    this.body = props.body;
    this.expiresInMs = props.expiresInMs;
  }
}
