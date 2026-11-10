import { Command, CommandProps } from '@libs/ddd';

export class AskNewDocumentCommand extends Command {
  readonly documentTypeId: string;

  constructor(props: CommandProps<AskNewDocumentCommand>) {
    super(props);
    this.documentTypeId = props.documentTypeId;
  }
}
