import { Command, CommandProps } from '@libs/ddd';

export interface UploadedFile {
  buffer: Buffer;
  mimeType: string;
}

export class SubmitRegistrationDocumentsCommand extends Command {
  readonly userId: string;
  readonly documentTypeId: string;
  readonly frontFile: UploadedFile | null;
  readonly backFile: UploadedFile | null;
  readonly expiresAt: Date | null;

  constructor(props: CommandProps<SubmitRegistrationDocumentsCommand>) {
    super(props);
    this.userId = props.userId;
    this.documentTypeId = props.documentTypeId;
    this.frontFile = props.frontFile;
    this.backFile = props.backFile;
    this.expiresAt = props.expiresAt;
  }
}
