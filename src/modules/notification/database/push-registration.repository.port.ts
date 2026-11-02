import { Option } from 'oxide.ts';
import { RepositoryPort } from '@libs/ddd';
import { PushRegistrationEntity } from '../domain/push-registration.entity';

export interface PushRegistrationRepositoryPort
  extends RepositoryPort<PushRegistrationEntity> {
  // The user's phone becomes this one. A phone belongs to one user: another
  // account connected on it no longer gets its notifications.
  save(registration: PushRegistrationEntity): Promise<void>;

  findTokenByUserId(userId: string): Promise<Option<string>>;

  deleteByUserId(userId: string): Promise<void>;
}
