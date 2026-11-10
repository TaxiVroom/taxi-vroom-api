import { Inject } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RegistrationRepositoryPort } from '@modules/registration/database/registration.repository.port';
import { REGISTRATION_REPOSITORY } from '@modules/registration/registration.di-tokens';
import { SendPushToUsersCommand } from '@modules/notification/commands/send-push-to-users/send-push-to-users.command';
import { AskNewDocumentCommand } from './ask-new-document.command';

const dayMs = 24 * 60 * 60 * 1000;

// A document type was added: the files waiting for the admin without it go
// back to "Mes documents", and the drivers are told. Spec
// docs/specs/documents-du-chauffeur.md, point 6.
@CommandHandler(AskNewDocumentCommand)
export class AskNewDocumentService implements ICommandHandler {
  constructor(
    @Inject(REGISTRATION_REPOSITORY)
    private readonly registrationRepo: RegistrationRepositoryPort,
    private readonly commandBus: CommandBus,
  ) {}

  async execute(command: AskNewDocumentCommand): Promise<void> {
    const asked = await this.registrationRepo.transaction(async () => {
      const pending = await this.registrationRepo.findPendingReviewWithout(
        command.documentTypeId,
      );
      const moved = pending.filter((registration) =>
        registration.askNewDocument().isOk(),
      );
      for (const registration of moved) {
        await this.registrationRepo.update(registration);
      }
      return moved.map((registration) => registration.getProps().userId);
    });
    await this.commandBus.execute(
      new SendPushToUsersCommand({
        userIds: asked,
        title: 'Un nouveau document est demandé',
        body: 'Ajoutez-le à votre dossier pour terminer votre inscription.',
        expiresInMs: dayMs,
        toRegistrations: true,
      }),
    );
  }
}
