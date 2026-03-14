import { AggregateID, AggregateRoot } from '@libs/ddd';
import { CreateDriverProps, DriverProps } from './driver.types';

export class DriverEntity extends AggregateRoot<DriverProps> {
  protected readonly _id: AggregateID;

  static create(props: CreateDriverProps): DriverEntity {
    // Driver uses the user's id (Firebase UID) as its own id.
    return new DriverEntity({
      id: props.userId,
      props: { userId: props.userId },
    });
  }

  validate(): void {}
}
