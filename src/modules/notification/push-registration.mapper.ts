import { Injectable } from '@nestjs/common';
import { Mapper } from '@libs/ddd';
import { PushRegistrationModel } from './database/push-registration.repository';
import { PushRegistrationEntity } from './domain/push-registration.entity';

@Injectable()
export class PushRegistrationMapper
  implements Mapper<PushRegistrationEntity, PushRegistrationModel, void>
{
  toPersistence(entity: PushRegistrationEntity): PushRegistrationModel {
    return entity.getProps();
  }

  toDomain(record: PushRegistrationModel): PushRegistrationEntity {
    return PushRegistrationEntity.create(record);
  }

  // A registration is never sent back to an app.
  toResponse(): void {
    return undefined;
  }
}
