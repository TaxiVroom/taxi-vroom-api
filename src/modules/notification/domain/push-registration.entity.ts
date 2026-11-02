import { AggregateID, AggregateRoot } from '@libs/ddd';
import { ArgumentNotProvidedException } from '@libs/exceptions';
import { PushRegistrationProps } from './push-registration.types';

// The phone of a user, to send them push notifications.
export class PushRegistrationEntity extends AggregateRoot<PushRegistrationProps> {
  protected readonly _id: AggregateID;

  static create(props: PushRegistrationProps): PushRegistrationEntity {
    // One phone per user: the registration has the user's id.
    return new PushRegistrationEntity({ id: props.userId, props });
  }

  validate(): void {
    if (!this.props.token) {
      throw new ArgumentNotProvidedException('Push registration: token');
    }
  }
}
