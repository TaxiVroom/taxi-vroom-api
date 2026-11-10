import { Command, CommandProps } from '@libs/ddd';

export interface DriverDocumentFile {
  buffer: Buffer;
  mimeType: string;
}

export class SubmitDriverDocumentCommand extends Command {
  readonly driverId: string;
  readonly documentTypeId: string;
  readonly frontFile: DriverDocumentFile;
  readonly backFile: DriverDocumentFile | null;
  readonly expiresAt: Date | null;

  constructor(props: CommandProps<SubmitDriverDocumentCommand>) {
    super(props);
    this.driverId = props.driverId;
    this.documentTypeId = props.documentTypeId;
    this.frontFile = props.frontFile;
    this.backFile = props.backFile;
    this.expiresAt = props.expiresAt;
  }
}
