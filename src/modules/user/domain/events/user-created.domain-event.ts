import { DomainEvent, DomainEventProps } from '@libs/ddd';

export class UserCreatedDomainEvent extends DomainEvent {
  readonly email: string;

  readonly phone: string;

  readonly firstName: string;

  readonly lastName: string;

  readonly role: string;

  // readonly country: string;
  // readonly postalCode: string;
  // readonly street: string;

  constructor(props: DomainEventProps<UserCreatedDomainEvent>) {
    super(props);
    this.email = props.email;
    this.phone = props.phone;
    this.firstName = props.firstName;
    this.lastName = props.lastName;
    this.role = props.role;
    // this.country = props.country;
    // this.postalCode = props.postalCode;
    // this.street = props.street;
  }
}
