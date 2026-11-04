import { Command, CommandProps } from '@libs/ddd';

export class AcceptBookingCommand extends Command {
  readonly rideId: string;

  readonly driverId: string;

  constructor(props: CommandProps<AcceptBookingCommand>) {
    super(props);
    this.rideId = props.rideId;
    this.driverId = props.driverId;
  }
}
