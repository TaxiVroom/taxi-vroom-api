import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DriverDocumentJobs } from '@modules/driver/application/driver-document-jobs';
import { ScheduleDocumentJobsCommand } from './schedule-document-jobs.command';

@CommandHandler(ScheduleDocumentJobsCommand)
export class ScheduleDocumentJobsService implements ICommandHandler {
  constructor(private readonly documentJobs: DriverDocumentJobs) {}

  async execute(command: ScheduleDocumentJobsCommand): Promise<void> {
    await this.documentJobs.schedule(command.documents, new Date());
  }
}
