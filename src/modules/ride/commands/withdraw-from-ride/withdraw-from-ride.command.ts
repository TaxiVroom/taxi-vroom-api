import { Command, CommandProps } from '@libs/ddd';

export class WithdrawFromRideCommand extends Command {
  readonly rideId: string;
  readonly driverId: string;

  constructor(props: CommandProps<WithdrawFromRideCommand>) {
    super(props);
    this.rideId = props.rideId;
    this.driverId = props.driverId;
  }
}
