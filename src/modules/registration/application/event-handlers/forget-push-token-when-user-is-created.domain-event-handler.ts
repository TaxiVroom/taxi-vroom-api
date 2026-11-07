import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { UserCreatedDomainEvent } from '@modules/user/domain/events/user-created.domain-event';
import { RegistrationRepositoryPort } from '@modules/registration/database/registration.repository.port';
import { REGISTRATION_REPOSITORY } from '@modules/registration/registration.di-tokens';

// The account exists: the phone token kept while waiting is now the
// account's (TellDriverWhenAccountIsCreated in the notification module), so
// the registration's copy goes, kept once only. Spec
// docs/specs/validation-du-dossier.md.
@Injectable()
export class ForgetPushTokenWhenUserIsCreatedDomainEventHandler {
  constructor(
    @Inject(REGISTRATION_REPOSITORY)
    private readonly registrationRepo: RegistrationRepositoryPort,
  ) {}

  // Handle a Domain Event by performing changes to other aggregates (inside
  // the same Domain), in the account's transaction.
  @OnEvent(UserCreatedDomainEvent.name, { async: true, promisify: true })
  async handle(event: UserCreatedDomainEvent): Promise<void> {
    return this.registrationRepo.forgetPushToken(event.aggregateId);
  }
}
