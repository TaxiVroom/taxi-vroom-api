import { RepositoryPort } from '@libs/ddd';
import { RegistrationEntity } from '../domain/registration.entity';
import { RegistrationBaseProps } from '../domain/registration.types';

export interface RegistrationRepositoryPort
  extends RepositoryPort<RegistrationEntity<RegistrationBaseProps>> {
  update(entity: RegistrationEntity<RegistrationBaseProps>): Promise<void>;

  // The phone's notification token while the account does not exist yet;
  // the last one replaces the previous. Spec
  // docs/specs/validation-du-dossier.md.
  savePushToken(userId: string, token: string): Promise<void>;

  // Once moved to the account: kept once only. Nothing to forget is fine.
  forgetPushToken(userId: string): Promise<void>;
}
