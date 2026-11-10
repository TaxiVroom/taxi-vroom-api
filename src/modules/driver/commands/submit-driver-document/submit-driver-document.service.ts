import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { randomUUID } from 'crypto';
import { Err, Ok, Result } from 'oxide.ts';
import { StoragePort } from '@libs/ports/storage.port';
import { STORAGE_PORT } from '@libs/storage/storage.di-tokens';
import { slugify } from '@libs/utils/slugify';
import { MIME_TYPE_TO_EXTENSION } from '@modules/registration/domain/registration-document.types';
import { DriverDocumentSubmissionRepositoryPort } from '@modules/driver/database/driver-document-submission.repository.port';
import { DriverDocumentSubmissionEntity } from '@modules/driver/domain/driver-document-submission.entity';
import {
  DriverDocumentBackRequiredError,
  DriverDocumentExpiredError,
  DriverDocumentExpiryRequiredError,
  DriverDocumentTypeNotFoundError,
  DriverUnsupportedFileTypeError,
} from '@modules/driver/domain/driver.errors';
import { DRIVER_DOCUMENT_SUBMISSION_REPOSITORY } from '@modules/driver/driver.di-tokens';
import {
  DriverDocumentFile,
  SubmitDriverDocumentCommand,
} from './submit-driver-document.command';

export type SubmitDriverDocumentError =
  | DriverDocumentTypeNotFoundError
  | DriverDocumentBackRequiredError
  | DriverDocumentExpiryRequiredError
  | DriverDocumentExpiredError
  | DriverUnsupportedFileTypeError;

// "Renouveler": the new document waits for the admin; its files go next to
// the valid one's, which stays until then. Spec
// docs/specs/documents-du-chauffeur.md.
@CommandHandler(SubmitDriverDocumentCommand)
export class SubmitDriverDocumentService implements ICommandHandler {
  constructor(
    @Inject(DRIVER_DOCUMENT_SUBMISSION_REPOSITORY)
    private readonly repo: DriverDocumentSubmissionRepositoryPort,
    @Inject(STORAGE_PORT) private readonly storage: StoragePort,
  ) {}

  async execute(
    command: SubmitDriverDocumentCommand,
  ): Promise<Result<null, SubmitDriverDocumentError>> {
    const found = await this.repo.findType(command.documentTypeId);
    if (found.isNone()) return Err(new DriverDocumentTypeNotFoundError());
    const type = found.unwrap();
    if (type.backRequired && !command.backFile) {
      return Err(new DriverDocumentBackRequiredError());
    }
    const folder = `drivers/${command.driverId}/${slugify(
      type.name,
    )}/renewal-${randomUUID()}`;
    const front = this.pathOf(command.frontFile, folder, 'front');
    if (front.isErr()) return Err(front.unwrapErr());
    const back: Result<string | null, DriverUnsupportedFileTypeError> =
      command.backFile
        ? this.pathOf(command.backFile, folder, 'back')
        : Ok(null);
    if (back.isErr()) return Err(back.unwrapErr());

    const created = DriverDocumentSubmissionEntity.create(
      {
        driverId: command.driverId,
        documentTypeId: type.id,
        frontFilePath: front.unwrap(),
        backFilePath: back.unwrap(),
        expiresAt: command.expiresAt,
      },
      type,
      new Date(),
    );
    if (created.isErr()) return Err(created.unwrapErr());
    await this.upload(command, front.unwrap(), back.unwrap());
    const submission = created.unwrap();
    await this.repo.transaction(async () => this.repo.upsert(submission));
    return Ok(null);
  }

  private pathOf(
    file: DriverDocumentFile,
    folder: string,
    side: 'front' | 'back',
  ): Result<string, DriverUnsupportedFileTypeError> {
    const extension = MIME_TYPE_TO_EXTENSION[file.mimeType];
    if (!extension) return Err(new DriverUnsupportedFileTypeError());
    return Ok(`${folder}/${side}.${extension}`);
  }

  private async upload(
    command: SubmitDriverDocumentCommand,
    frontPath: string,
    backPath: string | null,
  ): Promise<void> {
    await this.storage.uploadFile({
      ...command.frontFile,
      storagePath: frontPath,
    });
    if (command.backFile && backPath) {
      await this.storage.uploadFile({
        ...command.backFile,
        storagePath: backPath,
      });
    }
  }
}
