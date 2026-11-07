import { Module, Provider } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { RegisterPushTokenHttpController } from './commands/register-push-token/register-push-token.http.controller';
import { RegisterPushTokenService } from './commands/register-push-token/register-push-token.service';
import { UnregisterPushTokenHttpController } from './commands/unregister-push-token/unregister-push-token.http.controller';
import { UnregisterPushTokenService } from './commands/unregister-push-token/unregister-push-token.service';
import { SendPushService } from './commands/send-push/send-push.service';
import { PushRegistrationRepository } from './database/push-registration.repository';
import { FirebasePushSenderAdapter } from './infrastructure/firebase-push-sender.adapter';
import {
  PUSH_REGISTRATION_REPOSITORY,
  PUSH_SENDER,
} from './notification.di-tokens';
import { PushRegistrationMapper } from './push-registration.mapper';
import { TellDriverWhenAccountIsCreatedDomainEventHandler } from './application/event-handlers/tell-driver-when-account-is-created.domain-event-handler';

const eventHandlers: Provider[] = [
  TellDriverWhenAccountIsCreatedDomainEventHandler,
];

const httpControllers = [
  RegisterPushTokenHttpController,
  UnregisterPushTokenHttpController,
];

const commandHandlers: Provider[] = [
  RegisterPushTokenService,
  UnregisterPushTokenService,
  SendPushService,
];

const mappers: Provider[] = [PushRegistrationMapper];

const repositories: Provider[] = [
  {
    provide: PUSH_REGISTRATION_REPOSITORY,
    useClass: PushRegistrationRepository,
  },
];

const adapters: Provider[] = [
  { provide: PUSH_SENDER, useClass: FirebasePushSenderAdapter },
];

@Module({
  imports: [CqrsModule],
  controllers: [...httpControllers],
  providers: [
    ...commandHandlers,
    ...eventHandlers,
    ...mappers,
    ...repositories,
    ...adapters,
  ],
})
export class NotificationModule {}
