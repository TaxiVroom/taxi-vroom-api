import { OnEvent } from '@nestjs/event-emitter';
import { Inject, Injectable } from '@nestjs/common';
import { UserCreatedDomainEvent } from '@modules/user/domain/events/user-created.domain-event';
import { DriverRepositoryPort } from '@modules/driver/database/driver.repository.port';
import { DriverEntity } from '@modules/driver/domain/driver.entity';
import { UserRoles } from '@modules/user/domain/user.types';
import { DRIVER_REPOSITORY } from '@modules/driver/driver.di-tokens';

@Injectable()
export class CreateDriverWhenUserIsCreatedDomainEventHandler {
  constructor(
    @Inject(DRIVER_REPOSITORY)
    private readonly driverRepo: DriverRepositoryPort,
  ) {}

  @OnEvent(UserCreatedDomainEvent.name, { async: true, promisify: true })
  async handle(event: UserCreatedDomainEvent): Promise<void> {
    if (event.role !== UserRoles.driver) return;

    const driver = DriverEntity.create({ userId: event.aggregateId });
    await this.driverRepo.transaction(async () =>
      this.driverRepo.insert(driver),
    );
  }
}
