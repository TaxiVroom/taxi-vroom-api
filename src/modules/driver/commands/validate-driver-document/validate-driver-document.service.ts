import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import { DriverDocumentJobs } from '@modules/driver/application/driver-document-jobs';
import { DriverDocumentSubmissionRepositoryPort } from '@modules/driver/database/driver-document-submission.repository.port';
import {
  DriverDocumentExpiredError,
  DriverDocumentExpiryRequiredError,
  DriverDocumentSubmissionNotFoundError,
  DriverDocumentTypeNotFoundError,
} from '@modules/driver/domain/driver.errors';
import { DRIVER_DOCUMENT_SUBMISSION_REPOSITORY } from '@modules/driver/driver.di-tokens';
import { JobSchedulerPort } from '@libs/jobs/job-scheduler.port';
import { JOB_SCHEDULER } from '@libs/jobs/jobs.di-tokens';
import {
  documentJobKeys,
  documentTasks,
} from '@modules/driver/driver-documents.config';
import { ValidateDriverDocumentCommand } from './validate-driver-document.command';

export type ValidateDriverDocumentError =
  | DriverDocumentSubmissionNotFoundError
  | DriverDocumentTypeNotFoundError
  | DriverDocumentExpiryRequiredError
  | DriverDocumentExpiredError;

// The admin validates a sent document: it replaces the valid one, and its
// reminders and expiry replace the old ones, in one transaction. Spec
// docs/specs/documents-du-chauffeur.md.
@CommandHandler(ValidateDriverDocumentCommand)
export class ValidateDriverDocumentService implements ICommandHandler {
  constructor(
    @Inject(DRIVER_DOCUMENT_SUBMISSION_REPOSITORY)
    private readonly repo: DriverDocumentSubmissionRepositoryPort,
    private readonly documentJobs: DriverDocumentJobs,
    @Inject(JOB_SCHEDULER) private readonly jobs: JobSchedulerPort,
  ) {}

  async execute(
    command: ValidateDriverDocumentCommand,
  ): Promise<Result<null, ValidateDriverDocumentError>> {
    const found = await this.repo.findOneById(command.submissionId);
    if (found.isNone()) return Err(new DriverDocumentSubmissionNotFoundError());
    const submission = found.unwrap();
    const { driverId, documentTypeId } = submission.getProps();
    const type = await this.repo.findType(documentTypeId);
    if (type.isNone()) return Err(new DriverDocumentTypeNotFoundError());

    const now = new Date();
    const validated = submission.validateBy(
      command.expiresAt,
      type.unwrap(),
      now,
    );
    if (validated.isErr()) return Err(validated.unwrapErr());
    const { expiresAt } = submission.getProps();
    await this.repo.transaction(async () => {
      await this.repo.replaceDocument(submission);
      await this.documentJobs.schedule(
        [{ driverId, documentTypeId, expiresAt }],
        now,
      );
      // The driver is told, only once the validation is saved. Spec
      // docs/specs/documents-du-chauffeur.md, step 6 bis.
      await this.jobs.schedule([
        {
          task: documentTasks.validated,
          payload: { driverId, documentTypeId },
          runAt: now,
          key: documentJobKeys.validated(driverId, documentTypeId),
        },
      ]);
    });
    return Ok(null);
  }
}
