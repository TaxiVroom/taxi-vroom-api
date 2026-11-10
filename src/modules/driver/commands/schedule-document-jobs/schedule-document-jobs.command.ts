import { Command, CommandProps } from '@libs/ddd';
import { DocumentDates } from '@modules/driver/application/driver-document-jobs';

// The reminders and the expiry of documents, in the transaction of the
// caller. Spec docs/specs/documents-du-chauffeur.md.
export class ScheduleDocumentJobsCommand extends Command {
  readonly documents: DocumentDates[];

  constructor(props: CommandProps<ScheduleDocumentJobsCommand>) {
    super(props);
    this.documents = props.documents;
  }
}
