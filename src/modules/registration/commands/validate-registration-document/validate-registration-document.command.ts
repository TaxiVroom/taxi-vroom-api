import { Command, CommandProps } from '@libs/ddd';

export class ValidateRegistrationDocumentCommand extends Command {
  readonly documentId: string;
  // The date read on the photo by the admin, when the driver's was wrong.
  readonly expiresAt: Date | null;

  constructor(props: CommandProps<ValidateRegistrationDocumentCommand>) {
    super(props);
    this.documentId = props.documentId;
    this.expiresAt = props.expiresAt;
  }
}
