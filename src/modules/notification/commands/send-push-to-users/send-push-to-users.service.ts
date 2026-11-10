import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import {
  PushResult,
  PushSenderPort,
} from '@modules/notification/application/ports/push-sender.port';
import { PushRegistrationRepositoryPort } from '@modules/notification/database/push-registration.repository.port';
import {
  PUSH_REGISTRATION_REPOSITORY,
  PUSH_SENDER,
} from '@modules/notification/notification.di-tokens';
import { FindRegistrationPushTokensQuery } from '@modules/registration/queries/find-registration-push-token/find-registration-push-tokens.query-handler';
import { SendPushToUsersCommand } from './send-push-to-users.command';

// The tokens of all the users in one read, then one push per phone. Never
// fails, like SendPushCommand. Spec docs/specs/documents-du-chauffeur.md.
@CommandHandler(SendPushToUsersCommand)
export class SendPushToUsersService implements ICommandHandler {
  private readonly logger = new Logger(SendPushToUsersService.name);

  constructor(
    @Inject(PUSH_REGISTRATION_REPOSITORY)
    private readonly repo: PushRegistrationRepositoryPort,
    @Inject(PUSH_SENDER) private readonly sender: PushSenderPort,
    private readonly queryBus: QueryBus,
  ) {}

  async execute(command: SendPushToUsersCommand): Promise<void> {
    if (command.userIds.length === 0) return;
    try {
      const tokens: Map<string, string> = command.toRegistrations
        ? await this.queryBus.execute(
            new FindRegistrationPushTokensQuery({ userIds: command.userIds }),
          )
        : await this.repo.findTokensByUserIds(command.userIds);
      await this.sendAll(command, tokens);
    } catch (error) {
      this.logger.warn(`Pushes failed: ${(error as Error).message}`);
    }
  }

  private async sendAll(
    command: SendPushToUsersCommand,
    tokens: Map<string, string>,
  ): Promise<void> {
    const { title, body, expiresInMs, data } = command;
    for (const [userId, token] of tokens) {
      const result = await this.sender.send(token, {
        title,
        body,
        expiresInMs,
        data,
      });
      if (result === PushResult.tokenGone && !command.toRegistrations) {
        await this.repo.deleteByUserId(userId);
      }
    }
  }
}
