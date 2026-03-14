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

    const backFileIsRequired = documentType.backRequired;
    const backFileIsProvided = !!command.backFile;
    if (backFileIsRequired && !backFileIsProvided)
      return Err(new DocumentBackRequiredError());

    const documentTypeSlug = slugify(documentType.name);

    const frontExtensionResult = this.resolveFileExtension(
      command.frontFile.mimeType,
    );
    if (frontExtensionResult.isErr()) return frontExtensionResult;
    const frontStoragePath = this.buildStoragePath(
      command.userId,
      documentTypeSlug,
      'front',
      frontExtensionResult.unwrap(),
    );
    await this.uploadDocumentSide(command.frontFile, frontStoragePath);

    let backStoragePath: string | null = null;
    if (command.backFile) {
      const backExtensionResult = this.resolveFileExtension(
        command.backFile.mimeType,
      );
      if (backExtensionResult.isErr()) return backExtensionResult;
      backStoragePath = this.buildStoragePath(
        command.userId,
        documentTypeSlug,
        'back',
        backExtensionResult.unwrap(),
      );
      await this.uploadDocumentSide(command.backFile, backStoragePath);
    }

    const document = RegistrationDocumentEntity.create({
      driverRegId: command.userId,
      documentTypeId: command.documentTypeId,
      frontFilePath: frontStoragePath,
      backFilePath: backStoragePath,
    });

    await this.registrationDocumentRepo.upsert(document);
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

  private buildStoragePath(
    userId: string,
    documentTypeSlug: string,
    side: 'front' | 'back',
    extension: string,
  ): string {
    return `drivers/${userId}/${documentTypeSlug}/${side}.${extension}`;
  }

  private async uploadDocumentSide(
    file: FileInput,
    storagePath: string,
  ): Promise<void> {
    this.logger.log(
      `[uploadDocumentSide] storagePath="${storagePath}", mimeType=${file.mimeType}, bufferLength=${file.buffer?.length}`,
    );
    await this.storage.uploadFile({
      buffer: file.buffer,
      mimeType: file.mimeType,
      storagePath,
    });
    this.logger.log(
      `[uploadDocumentSide] upload terminé — storagePath="${storagePath}"`,
    );
  }
}
