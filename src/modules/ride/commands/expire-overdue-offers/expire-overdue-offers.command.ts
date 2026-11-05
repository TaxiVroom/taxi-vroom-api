import { Command, CommandProps } from '@libs/ddd';

// The offers left pending by a server restart: made before offeredBefore.
export class ExpireOverdueOffersCommand extends Command {
  readonly offeredBefore: Date;

  constructor(props: CommandProps<ExpireOverdueOffersCommand>) {
    super(props);
    this.offeredBefore = props.offeredBefore;
  }
}
