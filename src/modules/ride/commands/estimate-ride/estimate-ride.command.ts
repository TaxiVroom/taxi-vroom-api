import { Command, CommandProps } from '@libs/ddd';
import { RidePickup, RidePlace } from '@modules/ride/domain/ride.types';

export class EstimateRideCommand extends Command {
  readonly passengerId: string;
  readonly origin: RidePickup;
  readonly destination: RidePlace;

  constructor(props: CommandProps<EstimateRideCommand>) {
    super(props);
    this.passengerId = props.passengerId;
    this.origin = props.origin;
    this.destination = props.destination;
  }
}
