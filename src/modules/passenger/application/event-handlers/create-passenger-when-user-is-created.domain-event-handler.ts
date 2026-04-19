import { OnEvent } from '@nestjs/event-emitter';
import { Inject, Injectable } from '@nestjs/common';
import { UserCreatedDomainEvent } from '@modules/user/domain/events/user-created.domain-event';
import { PassengerRepositoryPort } from '@modules/passenger/database/passenger.repository.port';
import { PassengerEntity } from '@modules/passenger/domain/passenger.entity';
import { UserRoles } from '@modules/user/domain/user.types';
import { PASSENGER_REPOSITORY } from '@modules/passenger/passenger.di-tokens';

@Injectable()
export class CreatePassengerWhenUserIsCreatedDomainEventHandler {
  constructor(
    @Inject(PASSENGER_REPOSITORY)
    private readonly passengerRepo: PassengerRepositoryPort,
  ) {}

  @OnEvent(UserCreatedDomainEvent.name, { async: true, promisify: true })
  async handle(event: UserCreatedDomainEvent): Promise<void> {
    if (event.role !== UserRoles.passenger) return;

    const passenger = PassengerEntity.create({ userId: event.aggregateId });
    await this.passengerRepo.transaction(async () =>
      this.passengerRepo.insert(passenger),
    );
  }
}
