import { Command, CommandProps } from '@libs/ddd';

export class WithdrawFromBookingCommand extends Command {
  readonly rideId: string;

  readonly driverId: string;

  constructor(props: CommandProps<WithdrawFromBookingCommand>) {
    super(props);
    this.rideId = props.rideId;
    this.driverId = props.driverId;
  }
}
