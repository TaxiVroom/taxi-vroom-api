import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PushRegistrationRepositoryPort } from '@modules/notification/database/push-registration.repository.port';
import { PushRegistrationEntity } from '@modules/notification/domain/push-registration.entity';
import { PUSH_REGISTRATION_REPOSITORY } from '@modules/notification/notification.di-tokens';
import { RegisterPushTokenCommand } from './register-push-token.command';

@CommandHandler(RegisterPushTokenCommand)
export class RegisterPushTokenService implements ICommandHandler {
  constructor(
    @Inject(PUSH_REGISTRATION_REPOSITORY)
    private readonly repo: PushRegistrationRepositoryPort,
  ) {}

  async execute(command: RegisterPushTokenCommand): Promise<void> {
    const registration = PushRegistrationEntity.create({
      userId: command.userId,
      token: command.token,
    });
    await this.repo.transaction(() => this.repo.save(registration));
  }
}
