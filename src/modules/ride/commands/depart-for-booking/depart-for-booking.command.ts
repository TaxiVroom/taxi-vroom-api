import { Command, CommandProps } from '@libs/ddd';

export class DepartForBookingCommand extends Command {
  readonly rideId: string;

  readonly driverId: string;

  constructor(props: CommandProps<DepartForBookingCommand>) {
    super(props);
    this.rideId = props.rideId;
    this.driverId = props.driverId;
  }
}
