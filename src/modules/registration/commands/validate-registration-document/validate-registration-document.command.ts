import { Command, CommandProps } from '@libs/ddd';

export class ValidateRegistrationDocumentCommand extends Command {
  readonly documentId: string;

  constructor(props: CommandProps<ValidateRegistrationDocumentCommand>) {
    super(props);
    this.documentId = props.documentId;
  }
}
