import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { Ok, Result } from 'oxide.ts';
import { ConflictException } from '@libs/exceptions';
import { REGISTRATION_REPOSITORY } from '@modules/registration/registration.di-tokens';
import { RegistrationRepositoryPort } from '@modules/registration/database/registration.repository.port';
import { RegistrationEntity } from '@modules/registration/domain/registration.entity';
import {
  RegistrationBaseProps,
  RegistrationRole,
} from '@modules/registration/domain/registration.types';
import { PassengerRegistrationEntity } from '@modules/registration/domain/passenger-registration.entity';
import { DriverRegistrationEntity } from '@modules/registration/domain/driver-registration.entity';
import { GetOrCreateRegistrationCommand } from './get-or-create-registration.command';

@CommandHandler(GetOrCreateRegistrationCommand)
export class GetOrCreateRegistrationService implements ICommandHandler {
  constructor(
    @Inject(REGISTRATION_REPOSITORY)
    private readonly registrationRepo: RegistrationRepositoryPort,
  ) {}

  async execute(
    command: GetOrCreateRegistrationCommand,
  ): Promise<Result<RegistrationEntity<RegistrationBaseProps>, never>> {
    const existingOption = await this.registrationRepo.findOneById(
      command.userId,
    );
    if (existingOption.isSome()) {
      return Ok(existingOption.unwrap());
    }

    const registration = this.createRegistrationEntity(command);

    try {
      await this.registrationRepo.transaction(async () =>
        this.registrationRepo.insert(registration),
      );
    } catch (error) {
      // Race condition: another concurrent request created it just before us.
      if (error instanceof ConflictException) {
        const created = await this.registrationRepo.findOneById(command.userId);
        return Ok(created.unwrap());
      }
      throw error;
    }

    return Ok(registration);
  }

  private createRegistrationEntity(
    command: GetOrCreateRegistrationCommand,
  ): RegistrationEntity<RegistrationBaseProps> {
    const props = {
      userId: command.userId,
      role: command.role,
      phone: command.phone,
    };

    switch (command.role) {
      case RegistrationRole.passenger:
        return PassengerRegistrationEntity.create(props);
      case RegistrationRole.driver:
        return DriverRegistrationEntity.create(props);
    }
  }
}
