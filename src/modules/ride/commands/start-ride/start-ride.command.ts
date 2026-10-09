import { Command, CommandProps } from '@libs/ddd';

export class StartRideCommand extends Command {
  readonly rideId: string;
  readonly driverId: string;
  // The code the passenger told the driver.
  readonly boardingCode: string;

  constructor(props: CommandProps<StartRideCommand>) {
    super(props);
    this.rideId = props.rideId;
    this.driverId = props.driverId;
    this.boardingCode = props.boardingCode;
  }
}
