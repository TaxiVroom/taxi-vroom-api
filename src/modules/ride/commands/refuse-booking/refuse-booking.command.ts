import { Command, CommandProps } from '@libs/ddd';

export class RefuseBookingCommand extends Command {
  readonly rideId: string;

  readonly driverId: string;

  constructor(props: CommandProps<RefuseBookingCommand>) {
    super(props);
    this.rideId = props.rideId;
    this.driverId = props.driverId;
  }
}
