import { Command, CommandProps } from '@libs/ddd';

export class ExpireRideOfferCommand extends Command {
  readonly rideId: string;
  readonly offerId: string;

  constructor(props: CommandProps<ExpireRideOfferCommand>) {
    super(props);
    this.rideId = props.rideId;
    this.offerId = props.offerId;
  }
}
