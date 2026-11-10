import { Inject, Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { OnEvent } from '@nestjs/event-emitter';
import { Option } from 'oxide.ts';
import { UserCreatedDomainEvent } from '@modules/user/domain/events/user-created.domain-event';
import { UserRoles } from '@modules/user/domain/user.types';
import { FindRegistrationPushTokenQuery } from '@modules/registration/queries/find-registration-push-token/find-registration-push-token.query-handler';
import { PushRegistrationRepositoryPort } from '@modules/notification/database/push-registration.repository.port';
import { PushRegistrationEntity } from '@modules/notification/domain/push-registration.entity';
import { PUSH_REGISTRATION_REPOSITORY } from '@modules/notification/notification.di-tokens';
import { JobSchedulerPort } from '@libs/jobs/job-scheduler.port';
import { JOB_SCHEDULER } from '@libs/jobs/jobs.di-tokens';
import { registrationValidatedPushTask } from '@modules/notification/notification-jobs';

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
    @Inject(JOB_SCHEDULER) private readonly jobs: JobSchedulerPort,
  ) {}

  // Handle a Domain Event by performing changes to other aggregates (inside
  // the same Domain), in the account's transaction like every UserCreated
  // handler. "Dossier validé" is a job of that transaction: it leaves only
  // once the account is saved, and never if it fails (was
  // validatedPushBeforeCommit). Spec docs/specs/validation-du-dossier.md.
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
    await this.jobs.schedule([
      {
        task: registrationValidatedPushTask,
        payload: { userId },
        runAt: new Date(),
        key: `registration-validated:${userId}`,
      },
    ]);
  }
}
