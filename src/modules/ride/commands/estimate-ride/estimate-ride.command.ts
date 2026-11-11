import { Command, CommandProps } from '@libs/ddd';
import { RidePlace, RidePosition } from '@modules/ride/domain/ride.types';

export class EstimateRideCommand extends Command {
  readonly passengerId: string;
  readonly origin: RidePosition;
  // The pickup address found by the app on Mapbox, if any.
  readonly originName?: string;
  readonly destination: RidePlace;

  // Set to book the ride for later.
  readonly pickupAt?: Date;

  constructor(props: CommandProps<EstimateRideCommand>) {
    super(props);
    this.passengerId = props.passengerId;
    this.origin = props.origin;
    this.originName = props.originName;
    this.destination = props.destination;
    this.pickupAt = props.pickupAt;
  }
}
