import { AggregateRoot, AggregateID } from '@libs/ddd';
import { ArgumentNotProvidedException } from '@libs/exceptions';
import { randomUUID } from 'crypto';
import {
  CreateRegistrationDocumentProps,
  RegistrationDocumentProps,
} from './registration-document.types';

export type { RegistrationDocumentProps } from './registration-document.types';

export class RegistrationDocumentEntity extends AggregateRoot<RegistrationDocumentProps> {
  protected readonly _id: AggregateID;

  static create(
    props: CreateRegistrationDocumentProps,
  ): RegistrationDocumentEntity {
    return new RegistrationDocumentEntity({
      id: randomUUID(),
      props,
    });
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
