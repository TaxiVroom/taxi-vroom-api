import { OnEvent } from '@nestjs/event-emitter';
import { Inject, Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Option } from 'oxide.ts';
import { UserCreatedDomainEvent } from '@modules/user/domain/events/user-created.domain-event';
import { DriverRepositoryPort } from '@modules/driver/database/driver.repository.port';
import { DriverEntity } from '@modules/driver/domain/driver.entity';
import { UserRoles } from '@modules/user/domain/user.types';
import { DRIVER_REPOSITORY } from '@modules/driver/driver.di-tokens';
import {
  FindRegistrationVehicleQuery,
  RegistrationVehicleReadModel,
} from '@modules/registration/queries/find-registration-vehicle/find-registration-vehicle.query-handler';
import {
  FindRegistrationDocumentsQuery,
  RegistrationDocumentReadModel,
} from '@modules/registration/queries/find-registration-documents/find-registration-documents.query-handler';

@Injectable()
export class CreateDriverWhenUserIsCreatedDomainEventHandler {
  constructor(
    @Inject(DRIVER_REPOSITORY)
    private readonly driverRepo: DriverRepositoryPort,
    private readonly queryBus: QueryBus,
  ) {}

  // The vehicle and the validated documents of the registration become the
  // driver's. Specs docs/specs/vehicule-du-chauffeur.md and
  // docs/specs/inscription-chauffeur.md.
  @OnEvent(UserCreatedDomainEvent.name, { async: true, promisify: true })
  async handle(event: UserCreatedDomainEvent): Promise<void> {
    if (event.role !== UserRoles.driver) return;

    const userId = event.aggregateId;
    const vehicle: Option<RegistrationVehicleReadModel> =
      await this.queryBus.execute(new FindRegistrationVehicleQuery({ userId }));
    const documents: RegistrationDocumentReadModel[] =
      await this.queryBus.execute(
        new FindRegistrationDocumentsQuery({ userId }),
      );
    const driver = DriverEntity.create({
      userId,
      vehicle: vehicle.isSome() ? vehicle.unwrap() : null,
      documents,
    });
    // In the account's transaction, like every UserCreated handler: a
    // transaction opened here would clear the shared one when it ends, and
    // the other handlers would write outside it (2026-11-06).
    await this.driverRepo.insert(driver);
  }
}
