import { Command, CommandProps } from '@libs/ddd';

export class ReportNoShowCommand extends Command {
  readonly rideId: string;
  readonly driverId: string;

  constructor(props: CommandProps<ReportNoShowCommand>) {
    super(props);
    this.rideId = props.rideId;
    this.driverId = props.driverId;
  }
}
