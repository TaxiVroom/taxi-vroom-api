import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import { Inject, Logger } from '@nestjs/common';
import { REGISTRATION_REPOSITORY } from '@modules/registration/registration.di-tokens';
import { REGISTRATION_DOCUMENT_REPOSITORY } from '@modules/registration/registration.di-tokens';
import { DOCUMENT_TYPE_REPOSITORY } from '@modules/registration/registration.di-tokens';
import { RegistrationRepositoryPort } from '@modules/registration/database/registration.repository.port';
import { RegistrationDocumentRepositoryPort } from '@modules/registration/database/registration-document.repository.port';
import { DocumentTypeRepositoryPort } from '@modules/registration/database/document-type.repository.port';
import { RegistrationDocumentEntity } from '@modules/registration/domain/registration-document.entity';
import { DocumentStatus } from '@modules/registration/domain/registration-document.types';

import {
  DocumentExpiredError,
  DocumentExpiryRequiredError,
  DocumentTypeNotFoundError,
  RegistrationDocumentNotFoundError,
} from '@modules/registration/domain/registration-document.errors';
import {
  RegistrationNotFoundError,
  RegistrationNotCompleteError,
} from '@modules/registration/domain/registration.errors';
import { ValidateRegistrationDocumentCommand } from './validate-registration-document.command';

export type ValidateRegistrationDocumentError =
  | RegistrationDocumentNotFoundError
  | DocumentTypeNotFoundError
  | DocumentExpiryRequiredError
  | DocumentExpiredError
  | RegistrationNotFoundError
  | RegistrationNotCompleteError;

type ValidateResult = Result<void, ValidateRegistrationDocumentError>;

@CommandHandler(ValidateRegistrationDocumentCommand)
export class ValidateRegistrationDocumentService implements ICommandHandler {
  private readonly logger = new Logger(
    ValidateRegistrationDocumentService.name,
  );

  constructor(
    @Inject(REGISTRATION_REPOSITORY)
    private readonly registrationRepo: RegistrationRepositoryPort,
    @Inject(REGISTRATION_DOCUMENT_REPOSITORY)
    private readonly registrationDocumentRepo: RegistrationDocumentRepositoryPort,
    @Inject(DOCUMENT_TYPE_REPOSITORY)
    private readonly documentTypeRepo: DocumentTypeRepositoryPort,
  ) {}

  async execute(
    command: ValidateRegistrationDocumentCommand,
  ): Promise<ValidateResult> {
    this.logger.log(`[execute] documentId=${command.documentId}`);

    const document = await this.findDocument(command.documentId);
    if (!document) return Err(new RegistrationDocumentNotFoundError());

    const type = await this.documentTypeRepo.findOneById(
      document.getProps().documentTypeId,
    );
    if (type.isNone()) return Err(new DocumentTypeNotFoundError());
    const validated = document.markAsValidated(
      command.expiresAt,
      type.unwrap(),
      new Date(),
    );
    if (validated.isErr()) return Err(validated.unwrapErr());
    await this.registrationDocumentRepo.update(document);
    this.logger.log(
      `[execute] Document approuvé — documentId=${command.documentId}`,
    );

    const allDocumentsAreValidated =
      await this.checkAllDocumentsRequiredValidated(
        document.getProps().driverRegId,
      );

    if (allDocumentsAreValidated) {
      this.logger.log(
        `[execute] Tous les documents validés — complétion de la registration`,
      );
      const completionResult = await this.completeRegistration(
        document.getProps().driverRegId,
      );
      if (completionResult.isErr()) return completionResult;
    }

    return Ok(undefined);
  }

  private async findDocument(
    documentId: string,
  ): Promise<RegistrationDocumentEntity | null> {
    this.logger.log(`[findDocument] id=${documentId}`);
    const option = await this.registrationDocumentRepo.findOneById(documentId);
    return option.isSome() ? option.unwrap() : null;
  }

  private async checkAllDocumentsRequiredValidated(
    driverRegId: string,
  ): Promise<boolean> {
    // TODO: currently fetches all document types globally - if passenger documents are introduced,
    // document types should be filtered by role (driver/passenger) to avoid cross-contamination.
    const allDocumentTypes = await this.documentTypeRepo.findAll();
    const driverDocuments =
      await this.registrationDocumentRepo.findAllByDriverRegId(driverRegId);

    return allDocumentTypes.every((documentType) =>
      driverDocuments.some(
        (doc) =>
          doc.getProps().documentTypeId === documentType.id &&
          doc.getProps().status === DocumentStatus.VALIDATED,
      ),
    );
  }

  private async completeRegistration(
    driverRegId: string,
  ): Promise<
    Result<void, RegistrationNotFoundError | RegistrationNotCompleteError>
  > {
    const option = await this.registrationRepo.findOneById(driverRegId);
    if (option.isNone()) return Err(new RegistrationNotFoundError());

    const registration = option.unwrap();
    const completion = registration.complete();
    if (completion.isErr()) return Err(completion.unwrapErr());

    await this.registrationRepo.update(registration);
    this.logger.log(
      `[completeRegistration] Registration complétée — driverRegId=${driverRegId}`,
    );
    return Ok(undefined);
  }
}
