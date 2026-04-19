import { DomainEvent, DomainEventProps } from '@libs/ddd';

export class RegistrationCompletedDomainEvent extends DomainEvent {
  readonly email: string;

  readonly phone: string;

  readonly firstName: string;

  readonly lastName: string;

  readonly role: string;

  constructor(props: DomainEventProps<RegistrationCompletedDomainEvent>) {
    super(props);
    this.email = props.email;
    this.phone = props.phone;
    this.firstName = props.firstName;
    this.lastName = props.lastName;
    this.role = props.role;
  }
}
