import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import { Inject } from '@nestjs/common';
import { REGISTRATION_REPOSITORY } from '@modules/registration/registration.di-tokens';
import { RegistrationRepositoryPort } from '@modules/registration/database/registration.repository.port';
import { RegistrationEntity } from '@modules/registration/domain/registration.entity';
import { RegistrationBaseProps } from '@modules/registration/domain/registration.types';
import { RegistrationNotFoundError } from '@modules/registration/domain/registration.errors';
import { UpdateRegistrationCommand } from './update-registration.command';

@CommandHandler(UpdateRegistrationCommand)
export class UpdateRegistrationService implements ICommandHandler {
  constructor(
    @Inject(REGISTRATION_REPOSITORY)
    private readonly registrationRepo: RegistrationRepositoryPort,
  ) {}

  async execute(
    command: UpdateRegistrationCommand,
  ): Promise<
    Result<RegistrationEntity<RegistrationBaseProps>, RegistrationNotFoundError>
  > {
    const option = await this.registrationRepo.findOneById(command.userId);
    if (option.isNone()) {
      return Err(new RegistrationNotFoundError());
    }

    const registration = option.unwrap();
    registration.advanceStep({
      fromStep: command.fromStep,
      email: command.email,
      firstName: command.firstName,
      lastName: command.lastName,
    });

    await this.registrationRepo.update(registration);
    return Ok(registration);
  }
}
