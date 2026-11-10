import { AggregateRoot, AggregateID } from '@libs/ddd';
import { ArgumentNotProvidedException } from '@libs/exceptions';
import { randomUUID } from 'crypto';
import { isAfter } from 'date-fns';
import { Err, Ok, Result } from 'oxide.ts';
import {
  CreateRegistrationDocumentProps,
  DocumentStatus,
  RegistrationDocumentProps,
  RegistrationDocumentTypeRules,
} from './registration-document.types';
import {
  DocumentExpiredError,
  DocumentExpiryRequiredError,
} from './registration-document.errors';

type ExpiryError = DocumentExpiryRequiredError | DocumentExpiredError;

export type { RegistrationDocumentProps } from './registration-document.types';

export class RegistrationDocumentEntity extends AggregateRoot<RegistrationDocumentProps> {
  protected readonly _id: AggregateID;

  // A type that expires needs a date still to come; one that does not
  // expire keeps none. Spec docs/specs/documents-du-chauffeur.md, point 2.
  static create(
    props: CreateRegistrationDocumentProps,
    type: RegistrationDocumentTypeRules,
    now: Date,
  ): Result<RegistrationDocumentEntity, ExpiryError> {
    const expiresAt = RegistrationDocumentEntity.checkExpiry(
      props.expiresAt,
      type,
      now,
    );
    if (expiresAt.isErr()) return Err(expiresAt.unwrapErr());
    return Ok(
      new RegistrationDocumentEntity({
        id: randomUUID(),
        props: {
          ...props,
          expiresAt: expiresAt.unwrap(),
          status: DocumentStatus.SUBMITTED,
        },
      }),
    );
  }

  static checkExpiry(
    expiresAt: Date | null,
    type: RegistrationDocumentTypeRules,
    now: Date,
  ): Result<Date | null, ExpiryError> {
    if (!type.expires) return Ok(null);
    if (!expiresAt) return Err(new DocumentExpiryRequiredError());
    if (!isAfter(expiresAt, now)) return Err(new DocumentExpiredError());
    return Ok(expiresAt);
  }

  // The admin may correct the date read on the photo.
  markAsValidated(
    correctedExpiresAt: Date | null,
    type: RegistrationDocumentTypeRules,
    now: Date,
  ): Result<null, ExpiryError> {
    const expiresAt = RegistrationDocumentEntity.checkExpiry(
      correctedExpiresAt ?? this.props.expiresAt,
      type,
      now,
    );
    if (expiresAt.isErr()) return Err(expiresAt.unwrapErr());
    this.props.expiresAt = expiresAt.unwrap();
    this.props.status = DocumentStatus.VALIDATED;
    return Ok(null);
  }

  markAsRejected(): void {
    this.props.status = DocumentStatus.REJECTED;
  }

  validate(): void {
    if (
      !this.props.driverRegId ||
      !this.props.documentTypeId ||
      !this.props.frontFilePath
    ) {
      throw new ArgumentNotProvidedException(
        'RegistrationDocument: driverRegId, documentTypeId and frontFilePath are required',
      );
    }
  }
}
