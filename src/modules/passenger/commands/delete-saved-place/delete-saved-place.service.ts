import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import { PassengerSavedPlaceRepositoryPort } from '@modules/passenger/database/passenger-saved-place.repository.port';
import { SavedPlaceNotFoundError } from '@modules/passenger/domain/passenger.errors';
import { PASSENGER_SAVED_PLACE_REPOSITORY } from '@modules/passenger/passenger.di-tokens';
import { DeleteSavedPlaceCommand } from './delete-saved-place.command';

// "Supprimer", from the "Compte" tab.
@CommandHandler(DeleteSavedPlaceCommand)
export class DeleteSavedPlaceService implements ICommandHandler {
  constructor(
    @Inject(PASSENGER_SAVED_PLACE_REPOSITORY)
    private readonly repo: PassengerSavedPlaceRepositoryPort,
  ) {}

  async execute(
    command: DeleteSavedPlaceCommand,
  ): Promise<Result<void, SavedPlaceNotFoundError>> {
    const found = await this.repo.findOne(command.passengerId, command.kind);
    if (found.isNone()) return Err(new SavedPlaceNotFoundError());

    await this.repo.transaction(async () => this.repo.delete(found.unwrap()));
    return Ok(undefined);
  }
}
