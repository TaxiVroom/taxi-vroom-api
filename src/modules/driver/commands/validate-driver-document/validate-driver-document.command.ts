import { Command, CommandProps } from '@libs/ddd';

export class ValidateDriverDocumentCommand extends Command {
  readonly submissionId: string;
  // The date read on the photo by the admin, when the driver's was wrong.
  readonly expiresAt: Date | null;

  constructor(props: CommandProps<ValidateDriverDocumentCommand>) {
    super(props);
    this.submissionId = props.submissionId;
    this.expiresAt = props.expiresAt;
  }
}
