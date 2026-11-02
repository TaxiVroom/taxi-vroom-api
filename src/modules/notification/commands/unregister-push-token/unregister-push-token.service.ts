import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PushRegistrationRepositoryPort } from '@modules/notification/database/push-registration.repository.port';
import { PUSH_REGISTRATION_REPOSITORY } from '@modules/notification/notification.di-tokens';
import { UnregisterPushTokenCommand } from './unregister-push-token.command';

@CommandHandler(UnregisterPushTokenCommand)
export class UnregisterPushTokenService implements ICommandHandler {
  constructor(
    @Inject(PUSH_REGISTRATION_REPOSITORY)
    private readonly repo: PushRegistrationRepositoryPort,
  ) {}

  async execute(command: UnregisterPushTokenCommand): Promise<void> {
    await this.repo.transaction(() => this.repo.deleteByUserId(command.userId));
  }
}
