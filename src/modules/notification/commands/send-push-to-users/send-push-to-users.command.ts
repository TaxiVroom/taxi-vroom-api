import { Command, CommandProps } from '@libs/ddd';
import { PushData } from '@modules/notification/application/ports/push-sender.port';

// The same notification to many users, or their registration's phone for
// drivers not validated yet.
export class SendPushToUsersCommand extends Command {
  readonly userIds: string[];
  readonly title: string;
  readonly body: string;
  readonly expiresInMs: number;
  readonly data?: PushData;
  // Drivers still registering: their phone is kept with the registration.
  readonly toRegistrations?: boolean;

  constructor(props: CommandProps<SendPushToUsersCommand>) {
    super(props);
    this.userIds = props.userIds;
    this.title = props.title;
    this.body = props.body;
    this.expiresInMs = props.expiresInMs;
    this.data = props.data;
    this.toRegistrations = props.toRegistrations;
  }
}
