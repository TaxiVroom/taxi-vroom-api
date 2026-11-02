import { Command, CommandProps } from '@libs/ddd';
import { RideCompliment } from '@modules/ride/domain/ride.types';

export class RateRideCommand extends Command {
  readonly rideId: string;
  readonly passengerId: string;
  readonly stars: number;
  readonly compliments: RideCompliment[];

  constructor(props: CommandProps<RateRideCommand>) {
    super(props);
    this.rideId = props.rideId;
    this.passengerId = props.passengerId;
    this.stars = props.stars;
    this.compliments = props.compliments;
  }
}
