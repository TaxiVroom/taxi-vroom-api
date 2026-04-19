import { Command, CommandProps } from '@libs/ddd';

export class CompleteRegistrationCommand extends Command {
  readonly userId: string;

  constructor(props: CommandProps<CompleteRegistrationCommand>) {
    super(props);
    this.userId = props.userId;
  }
}
