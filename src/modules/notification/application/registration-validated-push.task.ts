import { Injectable, OnModuleInit } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { JobWorker } from '@libs/jobs/job-worker';
import { SendPushCommand } from '@modules/notification/commands/send-push/send-push.command';
import { registrationValidatedPushTask } from '@modules/notification/notification-jobs';

// A day: the driver may look at their phone the next morning.
const validationNewsLifetimeMs = 24 * 60 * 60_000;

interface RegistrationValidatedPayload {
  userId: string;
}

// "Dossier validé", sent by the worker once the account's transaction is
// saved. Spec docs/specs/validation-du-dossier.md.
@Injectable()
export class RegistrationValidatedPushTask implements OnModuleInit {
  constructor(
    private readonly worker: JobWorker,
    private readonly commandBus: CommandBus,
  ) {}

  onModuleInit(): void {
    this.worker.register(registrationValidatedPushTask, (payload) =>
      this.send(payload as RegistrationValidatedPayload),
    );
  }

  private async send({ userId }: RegistrationValidatedPayload): Promise<void> {
    await this.commandBus.execute(
      new SendPushCommand({
        userId,
        title: 'Dossier validé',
        body: 'Vous pouvez passer en ligne et recevoir vos premières courses.',
        expiresInMs: validationNewsLifetimeMs,
        // Tapped: the app opens the home at once, without reading the
        // registration again.
        data: { type: 'registration-validated' },
      }),
    );
  }
}
