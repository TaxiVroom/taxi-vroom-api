import { Command, CommandProps } from '@libs/ddd';
import { RideSupplement } from '@modules/ride/domain/ride.types';

export class CompleteRideCommand extends Command {
  readonly rideId: string;
  readonly driverId: string;
  // What the taxi's meter showed.
  readonly meterCents: number;
  readonly supplements: RideSupplement[];

  constructor(props: CommandProps<CompleteRideCommand>) {
    super(props);
    this.rideId = props.rideId;
    this.driverId = props.driverId;
    this.meterCents = props.meterCents;
    this.supplements = props.supplements;
  }
}
