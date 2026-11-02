import { Command, CommandProps } from '@libs/ddd';
import { RidePlace, RidePosition } from '@modules/ride/domain/ride.types';

export class EstimateRideCommand extends Command {
  readonly passengerId: string;
  readonly origin: RidePosition;
  readonly destination: RidePlace;

  constructor(props: CommandProps<EstimateRideCommand>) {
    super(props);
    this.passengerId = props.passengerId;
    this.origin = props.origin;
    this.destination = props.destination;
  }
}
