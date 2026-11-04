import { Command, CommandProps } from '@libs/ddd';
import { PushData } from '@modules/notification/application/ports/push-sender.port';

export class SendPushCommand extends Command {
  readonly userId: string;
  readonly title: string;
  readonly body: string;
  readonly expiresInMs: number;
  readonly data?: PushData;

  constructor(props: CommandProps<SendPushCommand>) {
    super(props);
    this.userId = props.userId;
    this.title = props.title;
    this.body = props.body;
    this.expiresInMs = props.expiresInMs;
    this.data = props.data;
  }
}
