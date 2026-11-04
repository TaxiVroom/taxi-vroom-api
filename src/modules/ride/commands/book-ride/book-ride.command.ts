import { Command, CommandProps } from '@libs/ddd';

export class BookRideCommand extends Command {
  readonly rideId: string;

  readonly passengerId: string;

  constructor(props: CommandProps<BookRideCommand>) {
    super(props);
    this.rideId = props.rideId;
    this.passengerId = props.passengerId;
  }
}
