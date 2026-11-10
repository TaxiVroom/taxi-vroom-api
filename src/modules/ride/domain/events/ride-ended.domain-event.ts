import { DomainEvent, DomainEventProps } from '@libs/ddd';

// The driver no longer has this ride: completed, cancelled by the
// passenger, passenger absent, or given up by the driver. Spec
// docs/specs/documents-du-chauffeur.md, point 15.
export class RideEndedDomainEvent extends DomainEvent {
  readonly driverId: string;

  constructor(props: DomainEventProps<RideEndedDomainEvent>) {
    super(props);
    this.driverId = props.driverId;
  }
}
