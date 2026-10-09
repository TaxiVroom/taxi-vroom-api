import { Command, CommandProps } from '@libs/ddd';

export class ArriveAtPickupCommand extends Command {
  readonly rideId: string;
  readonly driverId: string;

  constructor(props: CommandProps<ArriveAtPickupCommand>) {
    super(props);
    this.rideId = props.rideId;
    this.driverId = props.driverId;
  }
}
