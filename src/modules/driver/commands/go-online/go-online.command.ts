import { Command, CommandProps } from '@libs/ddd';

export class GoOnlineCommand extends Command {
  readonly driverId: string;

  constructor(props: CommandProps<GoOnlineCommand>) {
    super(props);
    this.driverId = props.driverId;
  }
}
