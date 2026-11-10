import { Command, CommandProps } from '@libs/ddd';

export class TakeBlockedDriversOfflineCommand extends Command {
  readonly driverIds: string[];
  // A ride that just ended, whose transaction is not saved yet.
  readonly exceptRideId?: string;

  constructor(props: CommandProps<TakeBlockedDriversOfflineCommand>) {
    super(props);
    this.driverIds = props.driverIds;
    this.exceptRideId = props.exceptRideId;
  }
}
