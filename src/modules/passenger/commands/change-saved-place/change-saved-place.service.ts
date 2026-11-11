import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import { PassengerSavedPlaceRepositoryPort } from '@modules/passenger/database/passenger-saved-place.repository.port';
import { PassengerSavedPlaceEntity } from '@modules/passenger/domain/passenger-saved-place.entity';
import { SavedPlaceNotFoundError } from '@modules/passenger/domain/passenger.errors';
import { PASSENGER_SAVED_PLACE_REPOSITORY } from '@modules/passenger/passenger.di-tokens';
import { ChangeSavedPlaceCommand } from './change-saved-place.command';

// "Modifier votre domicile", from the "Compte" tab.
@CommandHandler(ChangeSavedPlaceCommand)
export class ChangeSavedPlaceService implements ICommandHandler {
  constructor(
    @Inject(PASSENGER_SAVED_PLACE_REPOSITORY)
    private readonly repo: PassengerSavedPlaceRepositoryPort,
  ) {}

  async execute(
    command: ChangeSavedPlaceCommand,
  ): Promise<Result<PassengerSavedPlaceEntity, SavedPlaceNotFoundError>> {
    const found = await this.repo.findOne(command.passengerId, command.kind);
    if (found.isNone()) return Err(new SavedPlaceNotFoundError());
    const place = found.unwrap();

    place.moveTo({
      address: command.address,
      latitude: command.latitude,
      longitude: command.longitude,
    });
    await this.repo.transaction(async () => this.repo.save(place));
    return Ok(place);
  }
}
