import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import { REGISTRATION_REPOSITORY } from '@modules/registration/registration.di-tokens';
import { RegistrationRepositoryPort } from '@modules/registration/database/registration.repository.port';
import { RegistrationNotFoundError } from '@modules/registration/domain/registration.errors';
import { SaveRegistrationPushTokenCommand } from './save-registration-push-token.command';

// The waiting driver allowed notifications: their phone can be told when
// their documents are validated, before their account exists. Spec
// docs/specs/validation-du-dossier.md.
@CommandHandler(SaveRegistrationPushTokenCommand)
export class SaveRegistrationPushTokenService implements ICommandHandler {
  constructor(
    @Inject(REGISTRATION_REPOSITORY)
    private readonly registrationRepo: RegistrationRepositoryPort,
  ) {}

  async execute(
    command: SaveRegistrationPushTokenCommand,
  ): Promise<Result<void, RegistrationNotFoundError>> {
    const found = await this.registrationRepo.findOneById(command.userId);
    if (found.isNone()) return Err(new RegistrationNotFoundError());

    await this.registrationRepo.transaction(async () =>
      this.registrationRepo.savePushToken(command.userId, command.token),
    );
    return Ok(undefined);
  }
}
