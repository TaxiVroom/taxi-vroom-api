import { Command, CommandProps } from '@libs/ddd';

export class CancelRideCommand extends Command {
  readonly rideId: string;
  readonly passengerId: string;

  constructor(props: CommandProps<CancelRideCommand>) {
    super(props);
    this.rideId = props.rideId;
    this.passengerId = props.passengerId;
  }
}
