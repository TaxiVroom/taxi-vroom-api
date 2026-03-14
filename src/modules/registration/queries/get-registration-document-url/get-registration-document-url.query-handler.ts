import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { Err, Ok, Result } from 'oxide.ts';
import { QueryBase } from '@libs/ddd/query.base';
import { STORAGE_PORT } from '@libs/storage/storage.di-tokens';
import { StoragePort } from '@libs/ports/storage.port';
import { REGISTRATION_DOCUMENT_REPOSITORY } from '@modules/registration/registration.di-tokens';
import { RegistrationDocumentRepositoryPort } from '@modules/registration/database/registration-document.repository.port';
import { RegistrationDocumentNotFoundError } from '@modules/registration/domain/registration-document.errors';

const SIGNED_URL_TTL_SECONDS = 15 * 60; // 15 minutes

export class GetRegistrationDocumentUrlQuery extends QueryBase {
  readonly driverRegId: string;
  readonly documentTypeId: string;
  readonly side: 'front' | 'back';

  constructor(props: GetRegistrationDocumentUrlQuery) {
    super();
    this.driverRegId = props.driverRegId;
    this.documentTypeId = props.documentTypeId;
    this.side = props.side;
  }
}

@QueryHandler(GetRegistrationDocumentUrlQuery)
export class GetRegistrationDocumentUrlQueryHandler implements IQueryHandler {
  constructor(
    @Inject(REGISTRATION_DOCUMENT_REPOSITORY)
    private readonly registrationDocumentRepo: RegistrationDocumentRepositoryPort,
    @Inject(STORAGE_PORT)
    private readonly storage: StoragePort,
  ) {}

  async execute(
    query: GetRegistrationDocumentUrlQuery,
  ): Promise<Result<string, RegistrationDocumentNotFoundError>> {
    const option =
      await this.registrationDocumentRepo.findOneByDriverRegIdAndDocumentTypeId(
        query.driverRegId,
        query.documentTypeId,
      );

    if (option.isNone()) {
      return Err(new RegistrationDocumentNotFoundError());
    }

    const document = option.unwrap();
    const props = document.getProps();
    const storagePath =
      query.side === 'front' ? props.frontFilePath : props.backFilePath;

    if (!storagePath) {
      return Err(new RegistrationDocumentNotFoundError());
    }

    const url = await this.storage.generateSignedUrl(
      storagePath,
      SIGNED_URL_TTL_SECONDS,
    );
    return Ok(url);
  }
}
