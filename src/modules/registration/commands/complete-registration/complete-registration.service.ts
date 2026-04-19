import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import { Inject } from '@nestjs/common';
import { AggregateID } from '@libs/ddd';
import { REGISTRATION_REPOSITORY } from '@modules/registration/registration.di-tokens';
import { RegistrationRepositoryPort } from '@modules/registration/database/registration.repository.port';
import {
  RegistrationNotCompleteError,
  RegistrationMissingPhoneError,
} from '@modules/registration/domain/registration.errors';
import { CompleteRegistrationCommand } from './complete-registration.command';
import { NotFoundException } from '@libs/exceptions';

@CommandHandler(CompleteRegistrationCommand)
export class CompleteRegistrationService implements ICommandHandler {
  constructor(
    @Inject(REGISTRATION_REPOSITORY)
    private readonly registrationRepo: RegistrationRepositoryPort,
  ) {}

  async execute(
    command: CompleteRegistrationCommand,
  ): Promise<
    Result<
      AggregateID,
      | NotFoundException
      | RegistrationNotCompleteError
      | RegistrationMissingPhoneError
    >
  > {
    const option = await this.registrationRepo.findOneById(command.userId);
    if (option.isNone()) {
      return Err(new NotFoundException());
    }

    const registration = option.unwrap();
    try {
      registration.complete();
    } catch (error) {
      if (
        error instanceof RegistrationNotCompleteError ||
        error instanceof RegistrationMissingPhoneError
      ) {
        return Err(error);
      }
      throw error;
    }

    // update() persists COMPLETE step and calls publishEvents() → fires RegistrationCompletedDomainEvent.
    await this.registrationRepo.update(registration);

    return Ok(command.userId);
  }
}
