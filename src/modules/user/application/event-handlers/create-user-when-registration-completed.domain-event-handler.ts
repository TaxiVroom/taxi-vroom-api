import { OnEvent } from '@nestjs/event-emitter';
import { Inject, Injectable } from '@nestjs/common';
import { RegistrationCompletedDomainEvent } from '@modules/registration/domain/events/registration-completed.domain-event';
import { UserRepositoryPort } from '@modules/user/database/user.repository.port';
import { UserEntity } from '@modules/user/domain/user.entity';
import { UserRoles } from '@modules/user/domain/user.types';
import { USER_REPOSITORY } from '@modules/user/user.di-tokens';

@Injectable()
export class CreateUserWhenRegistrationCompletedDomainEventHandler {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepositoryPort,
  ) {}

  @OnEvent(RegistrationCompletedDomainEvent.name, {
    async: true,
    promisify: true,
  })
  async handle(event: RegistrationCompletedDomainEvent): Promise<void> {
    const user = UserEntity.create({
      id: event.aggregateId, // Firebase UID becomes the user id
      email: event.email,
      phone: event.phone,
      firstName: event.firstName,
      lastName: event.lastName,
      role: event.role as UserRoles,
    });

    await this.userRepo.transaction(async () => this.userRepo.insert(user));
  }
}
