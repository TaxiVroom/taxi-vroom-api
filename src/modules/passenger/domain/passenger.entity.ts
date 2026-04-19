import { AggregateID, AggregateRoot } from '@libs/ddd';
import { CreatePassengerProps, PassengerProps } from './passenger.types';

export class PassengerEntity extends AggregateRoot<PassengerProps> {
  protected readonly _id: AggregateID;

  static create(props: CreatePassengerProps): PassengerEntity {
    // Passenger uses the user's id (Firebase UID) as its own id.
    return new PassengerEntity({
      id: props.userId,
      props: { userId: props.userId },
    });
  }

  validate(): void {}
}
