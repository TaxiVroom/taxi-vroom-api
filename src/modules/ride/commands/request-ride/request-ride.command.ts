import { Command, CommandProps } from '@libs/ddd';
import {
  EstimatedPrice,
  RidePickup,
  RidePlace,
} from '@modules/ride/domain/ride.types';

export class RequestRideCommand extends Command {
  readonly passengerId: string;
  readonly origin: RidePickup;
  readonly destination: RidePlace;
  readonly estimatedPrice: EstimatedPrice;

  constructor(props: CommandProps<RequestRideCommand>) {
    super(props);
    this.passengerId = props.passengerId;
    this.origin = props.origin;
    this.destination = props.destination;
    this.estimatedPrice = props.estimatedPrice;
  }
}
