import { randomUUID } from 'crypto';
import { isAfter } from 'date-fns';
import { Err, Ok, Result } from 'oxide.ts';
import { AggregateID, AggregateRoot } from '@libs/ddd';
import { ArgumentNotProvidedException } from '@libs/exceptions';
import {
  DriverDocumentSubmissionProps,
  DriverDocumentTypeRules,
} from './driver-document-submission.types';
import {
  DriverDocumentExpiredError,
  DriverDocumentExpiryRequiredError,
} from './driver.errors';

type ExpiryError =
  | DriverDocumentExpiryRequiredError
  | DriverDocumentExpiredError;

// The same date rule as a registration document, kept in each module: a
// module never imports another's entity (CLAUDE.md). Spec
// docs/specs/documents-du-chauffeur.md, points 2 and 10.
export class DriverDocumentSubmissionEntity extends AggregateRoot<DriverDocumentSubmissionProps> {
  protected readonly _id: AggregateID;

  static create(
    props: DriverDocumentSubmissionProps,
    type: DriverDocumentTypeRules,
    now: Date,
  ): Result<DriverDocumentSubmissionEntity, ExpiryError> {
    const expiresAt = DriverDocumentSubmissionEntity.checkExpiry(
      props.expiresAt,
      type,
      now,
    );
    if (expiresAt.isErr()) return Err(expiresAt.unwrapErr());
    return Ok(
      new DriverDocumentSubmissionEntity({
        id: randomUUID(),
        props: { ...props, expiresAt: expiresAt.unwrap() },
      }),
    );
  }

  private static checkExpiry(
    expiresAt: Date | null,
    type: DriverDocumentTypeRules,
    now: Date,
  ): Result<Date | null, ExpiryError> {
    if (!type.expires) return Ok(null);
    if (!expiresAt) return Err(new DriverDocumentExpiryRequiredError());
    if (!isAfter(expiresAt, now)) return Err(new DriverDocumentExpiredError());
    return Ok(expiresAt);
  }

  // The admin may correct the date read on the photo.
  validateBy(
    correctedExpiresAt: Date | null,
    type: DriverDocumentTypeRules,
    now: Date,
  ): Result<null, ExpiryError> {
    const expiresAt = DriverDocumentSubmissionEntity.checkExpiry(
      correctedExpiresAt ?? this.props.expiresAt,
      type,
      now,
    );
    if (expiresAt.isErr()) return Err(expiresAt.unwrapErr());
    this.props.expiresAt = expiresAt.unwrap();
    return Ok(null);
  }

  validate(): void {
    const { driverId, documentTypeId, frontFilePath } = this.props;
    if (!driverId || !documentTypeId || !frontFilePath) {
      throw new ArgumentNotProvidedException(
        'DriverDocumentSubmission: driverId, documentTypeId and frontFilePath are required',
      );
    }
  }
}
