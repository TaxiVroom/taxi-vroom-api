import { RepositoryPort } from '@libs/ddd';
import { RegistrationEntity } from '../domain/registration.entity';
import { RegistrationBaseProps } from '../domain/registration.types';

export interface RegistrationRepositoryPort
  extends RepositoryPort<RegistrationEntity<RegistrationBaseProps>> {
  update(entity: RegistrationEntity<RegistrationBaseProps>): Promise<void>;
}
