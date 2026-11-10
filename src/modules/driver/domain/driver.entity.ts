import { randomUUID } from 'crypto';
import { Err, Ok, Result } from 'oxide.ts';
import { AggregateID, AggregateRoot } from '@libs/ddd';
import { CreateDriverProps, DriverProps } from './driver.types';
import { DriverDocumentsBlockingError } from './driver.errors';

export class DriverEntity extends AggregateRoot<DriverProps> {
  protected readonly _id: AggregateID;

  static create(props: CreateDriverProps): DriverEntity {
    // Driver uses the user's id (Firebase UID) as its own id.
    return new DriverEntity({
      id: props.userId,
      props: {
        userId: props.userId,
        vehicle: props.vehicle,
        documents: props.documents.map((document) => ({
          id: randomUUID(),
          ...document,
        })),
      },
    });
  }

  // A document expired or missing keeps the driver offline; a ride in
  // progress is never stopped for it. Spec
  // docs/specs/documents-du-chauffeur.md, point 8.
  static goOnline(
    documentsBlock: boolean,
  ): Result<null, DriverDocumentsBlockingError> {
    if (documentsBlock) return Err(new DriverDocumentsBlockingError());
    return Ok(null);
  }

  validate(): void {}
}
