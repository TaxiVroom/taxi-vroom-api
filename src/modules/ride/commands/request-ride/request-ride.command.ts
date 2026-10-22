import { Command, CommandProps } from '@libs/ddd';

export class RequestRideCommand extends Command {
  readonly rideId: string;
  readonly passengerId: string;

  constructor(props: CommandProps<RequestRideCommand>) {
    super(props);
    this.rideId = props.rideId;
    this.passengerId = props.passengerId;
  }
}
