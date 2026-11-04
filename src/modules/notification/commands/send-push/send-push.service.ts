import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  PushResult,
  PushSenderPort,
} from '@modules/notification/application/ports/push-sender.port';
import { PushRegistrationRepositoryPort } from '@modules/notification/database/push-registration.repository.port';
import {
  PUSH_REGISTRATION_REPOSITORY,
  PUSH_SENDER,
} from '@modules/notification/notification.di-tokens';
import { SendPushCommand } from './send-push.command';

// Never fails: a push only warns the user, the ride goes on without it.
@CommandHandler(SendPushCommand)
export class SendPushService implements ICommandHandler {
  private readonly logger = new Logger(SendPushService.name);

  constructor(
    @Inject(PUSH_REGISTRATION_REPOSITORY)
    private readonly repo: PushRegistrationRepositoryPort,
    @Inject(PUSH_SENDER) private readonly sender: PushSenderPort,
  ) {}

  async execute(command: SendPushCommand): Promise<void> {
    try {
      await this.send(command);
    } catch (error) {
      this.logger.warn(
        `Push to ${command.userId} failed: ${(error as Error).message}`,
      );
    }
  }

  private async send(command: SendPushCommand): Promise<void> {
    const { userId, title, body, expiresInMs, data } = command;
    const token = await this.repo.findTokenByUserId(userId);
    if (token.isNone()) return;

    const result = await this.sender.send(token.unwrap(), {
      title,
      body,
      expiresInMs,
      data,
    });
    if (result === PushResult.tokenGone) {
      await this.repo.deleteByUserId(userId);
    }
  }
}
