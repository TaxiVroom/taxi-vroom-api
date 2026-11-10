import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import { Inject, Logger } from '@nestjs/common';
import { STORAGE_PORT } from '@libs/storage/storage.di-tokens';
import { StoragePort } from '@libs/ports/storage.port';
import { REGISTRATION_REPOSITORY } from '@modules/registration/registration.di-tokens';
import { REGISTRATION_DOCUMENT_REPOSITORY } from '@modules/registration/registration.di-tokens';
import { DOCUMENT_TYPE_REPOSITORY } from '@modules/registration/registration.di-tokens';
import { RegistrationRepositoryPort } from '@modules/registration/database/registration.repository.port';
import { RegistrationDocumentRepositoryPort } from '@modules/registration/database/registration-document.repository.port';
import {
  DocumentTypeRepositoryPort,
  DocumentTypeProps,
} from '@modules/registration/database/document-type.repository.port';
import { RegistrationDocumentEntity } from '@modules/registration/domain/registration-document.entity';
import { MIME_TYPE_TO_EXTENSION } from '@modules/registration/domain/registration-document.types';
import { slugify } from '@libs/utils/slugify';
import {
  DocumentBackRequiredError,
  DocumentExpiredError,
  DocumentExpiryRequiredError,
  DocumentTypeNotFoundError,
  UnsupportedFileTypeError,
} from '@modules/registration/domain/registration-document.errors';
import { RegistrationNotFoundError } from '@modules/registration/domain/registration.errors';
import { SubmitRegistrationDocumentsCommand } from './submit-registration-documents.command';

type FileInput = { buffer: Buffer; mimeType: string };
type SubmitResult = Result<
  void,
  | RegistrationNotFoundError
  | DocumentTypeNotFoundError
  | DocumentBackRequiredError
  | UnsupportedFileTypeError
  | DocumentExpiryRequiredError
  | DocumentExpiredError
>;

@CommandHandler(SubmitRegistrationDocumentsCommand)
export class SubmitRegistrationDocumentsService implements ICommandHandler {
  private readonly logger = new Logger(SubmitRegistrationDocumentsService.name);

  constructor(
    @Inject(REGISTRATION_REPOSITORY)
    private readonly registrationRepo: RegistrationRepositoryPort,
    @Inject(REGISTRATION_DOCUMENT_REPOSITORY)
    private readonly registrationDocumentRepo: RegistrationDocumentRepositoryPort,
    @Inject(DOCUMENT_TYPE_REPOSITORY)
    private readonly documentTypeRepo: DocumentTypeRepositoryPort,
    @Inject(STORAGE_PORT)
    private readonly storage: StoragePort,
  ) {}

  async execute(
    command: SubmitRegistrationDocumentsCommand,
  ): Promise<SubmitResult> {
    this.logger.log(
      `[execute] userId=${command.userId}, documentTypeId=${command.documentTypeId}`,
    );

    const registrationExists = await this.registrationExists(command.userId);
    if (!registrationExists) return Err(new RegistrationNotFoundError());

    const documentType = await this.findDocumentType(command.documentTypeId);
    if (!documentType) return Err(new DocumentTypeNotFoundError());

    const previousDocument = await this.findPreviousDocument(
      command.userId,
      command.documentTypeId,
    );

    const backSideIsAbsent =
      documentType.backRequired &&
      !command.backFile &&
      !previousDocument?.backFilePath;
    if (backSideIsAbsent) return Err(new DocumentBackRequiredError());

    const documentTypeSlug = slugify(documentType.name);

    const frontPathResult = await this.resolveStoragePath({
      newFile: command.frontFile,
      existingPath: previousDocument?.frontFilePath ?? null,
      userId: command.userId,
      documentTypeSlug,
      side: 'front',
    });
    if (frontPathResult.isErr()) return frontPathResult;

    const backPathResult = await this.resolveStoragePath({
      newFile: command.backFile ?? null,
      existingPath: previousDocument?.backFilePath ?? null,
      userId: command.userId,
      documentTypeSlug,
      side: 'back',
    });
    if (backPathResult.isErr()) return backPathResult;

    const created = RegistrationDocumentEntity.create(
      {
        driverRegId: command.userId,
        documentTypeId: command.documentTypeId,
        frontFilePath: frontPathResult.unwrap()!,
        backFilePath: backPathResult.unwrap(),
        expiresAt: command.expiresAt,
      },
      documentType,
      new Date(),
    );
    if (created.isErr()) return Err(created.unwrapErr());

    // Simulated upload error — remove when done testing
    //throw new Error('Simulated upload error');

    await this.registrationDocumentRepo.upsert(created.unwrap());
    return Ok(undefined);
  }

  private async registrationExists(userId: string): Promise<boolean> {
    this.logger.log(`[registrationExists] userId=${userId}`);
    const registration = await this.registrationRepo.findOneById(userId);
    this.logger.log(`[registrationExists] trouvée : ${registration.isSome()}`);
    return registration.isSome();
  }

  private async findDocumentType(
    documentTypeId: string,
  ): Promise<DocumentTypeProps | null> {
    this.logger.log(`[findDocumentType] id=${documentTypeId}`);
    const option = await this.documentTypeRepo.findOneById(documentTypeId);
    this.logger.log(
      `[findDocumentType] trouvé : ${option.isSome()}, backRequired=${
        option.isSome() ? option.unwrap().backRequired : 'N/A'
      }`,
    );
    return option.isSome() ? option.unwrap() : null;
  }

  private async findPreviousDocument(
    userId: string,
    documentTypeId: string,
  ): Promise<{ frontFilePath: string; backFilePath: string | null } | null> {
    const option =
      await this.registrationDocumentRepo.findOneByDriverRegIdAndDocumentTypeId(
        userId,
        documentTypeId,
      );
    if (option.isNone()) return null;
    const { frontFilePath, backFilePath } = option.unwrap().getProps();
    return { frontFilePath, backFilePath };
  }

  // Uploads the new file if provided, otherwise keeps the existing path as-is.
  private async resolveStoragePath(params: {
    newFile: FileInput | null;
    existingPath: string | null;
    userId: string;
    documentTypeSlug: string;
    side: 'front' | 'back';
  }): Promise<Result<string | null, UnsupportedFileTypeError>> {
    const { newFile, existingPath, userId, documentTypeSlug, side } = params;

    if (!newFile) return Ok(existingPath);

    const extensionResult = this.resolveFileExtension(newFile.mimeType);
    if (extensionResult.isErr()) return extensionResult;

    // The mobile always sends JPEG (ImageCropper converts everything to JPEG),
    // so the path is always the same → Firebase silently overwrites the old file.
    const storagePath = `drivers/${userId}/${documentTypeSlug}/${side}.${extensionResult.unwrap()}`;
    await this.uploadFile(newFile, storagePath);
    return Ok(storagePath);
  }

  private resolveFileExtension(
    mimeType: string,
  ): Result<string, UnsupportedFileTypeError> {
    const extension = MIME_TYPE_TO_EXTENSION[mimeType];
    if (!extension) {
      this.logger.warn(
        `[resolveFileExtension] type MIME non supporté : ${mimeType}`,
      );
      return Err(new UnsupportedFileTypeError());
    }
    return Ok(extension);
  }

  private async uploadFile(
    file: FileInput,
    storagePath: string,
  ): Promise<void> {
    this.logger.log(
      `[uploadFile] storagePath="${storagePath}", mimeType=${file.mimeType}, bufferLength=${file.buffer?.length}`,
    );
    await this.storage.uploadFile({
      buffer: file.buffer,
      mimeType: file.mimeType,
      storagePath,
    });
    this.logger.log(`[uploadFile] terminé — storagePath="${storagePath}"`);
  }
}
