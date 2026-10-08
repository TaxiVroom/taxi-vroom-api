import { Command, CommandProps } from '@libs/ddd';

export class DeclineRideOfferCommand extends Command {
  readonly rideId: string;
  readonly driverId: string;

  constructor(props: CommandProps<DeclineRideOfferCommand>) {
    super(props);
    this.rideId = props.rideId;
    this.driverId = props.driverId;
  }
}
