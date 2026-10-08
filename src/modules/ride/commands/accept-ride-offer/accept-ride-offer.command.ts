import { Command, CommandProps } from '@libs/ddd';

export class AcceptRideOfferCommand extends Command {
  readonly rideId: string;
  readonly driverId: string;

  constructor(props: CommandProps<AcceptRideOfferCommand>) {
    super(props);
    this.rideId = props.rideId;
    this.driverId = props.driverId;
  }
}
