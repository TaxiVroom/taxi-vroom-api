import { Inject, Injectable } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { OnEvent } from '@nestjs/event-emitter';
import { Option } from 'oxide.ts';
import { UserCreatedDomainEvent } from '@modules/user/domain/events/user-created.domain-event';
import { UserRoles } from '@modules/user/domain/user.types';
import { FindRegistrationPushTokenQuery } from '@modules/registration/queries/find-registration-push-token/find-registration-push-token.query-handler';
import { PushRegistrationRepositoryPort } from '@modules/notification/database/push-registration.repository.port';
import { PushRegistrationEntity } from '@modules/notification/domain/push-registration.entity';
import { SendPushCommand } from '@modules/notification/commands/send-push/send-push.command';
import { PUSH_REGISTRATION_REPOSITORY } from '@modules/notification/notification.di-tokens';

// A day: the driver may look at their phone the next morning.
const validationNewsLifetimeMs = 24 * 60 * 60_000;

// A driver's account is created once their documents are validated: the
// phone token given while waiting becomes the account's, and the driver is
// told they can take rides. The registration module forgets its copy on the
// same event. Spec docs/specs/validation-du-dossier.md.
@Injectable()
export class TellDriverWhenAccountIsCreatedDomainEventHandler {
  constructor(
    @Inject(PUSH_REGISTRATION_REPOSITORY)
    private readonly pushRegistrationRepo: PushRegistrationRepositoryPort,
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  // Handle a Domain Event by performing changes to other aggregates (inside
  // the same Domain), in the account's transaction like every UserCreated
  // handler. The push may leave before that transaction ends: accepted for
  // now (validatedPushBeforeCommit in the API memory).
  @OnEvent(UserCreatedDomainEvent.name, { async: true, promisify: true })
  async handle(event: UserCreatedDomainEvent): Promise<void> {
    if (event.role !== UserRoles.driver) return;
    const userId = event.aggregateId;

    // Read as committed: still there if the registration forgets it first.
    const token: Option<string> = await this.queryBus.execute(
      new FindRegistrationPushTokenQuery({ userId }),
    );
    // No permission given while waiting: nothing to tell the phone.
    if (token.isNone()) return;

    const registration = PushRegistrationEntity.create({
      userId,
      token: token.unwrap(),
    });
    await this.pushRegistrationRepo.save(registration);
    await this.commandBus.execute(
      new SendPushCommand({
        userId,
        title: 'Dossier validé',
        body: 'Vous pouvez passer en ligne et recevoir vos premières courses.',
        expiresInMs: validationNewsLifetimeMs,
      }),
    );
  }
}
