import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import { ConflictException } from '@libs/exceptions';
import { PassengerSavedPlaceRepositoryPort } from '@modules/passenger/database/passenger-saved-place.repository.port';
import { PassengerSavedPlaceEntity } from '@modules/passenger/domain/passenger-saved-place.entity';
import { SavedPlaceAlreadyExistsError } from '@modules/passenger/domain/passenger.errors';
import { PASSENGER_SAVED_PLACE_REPOSITORY } from '@modules/passenger/passenger.di-tokens';
import { AddSavedPlaceCommand } from './add-saved-place.command';

// "Ajouter votre domicile" or "Ajouter votre lieu de travail".
@CommandHandler(AddSavedPlaceCommand)
export class AddSavedPlaceService implements ICommandHandler {
  constructor(
    @Inject(PASSENGER_SAVED_PLACE_REPOSITORY)
    private readonly repo: PassengerSavedPlaceRepositoryPort,
  ) {}

  async execute(
    command: AddSavedPlaceCommand,
  ): Promise<Result<PassengerSavedPlaceEntity, SavedPlaceAlreadyExistsError>> {
    const place = PassengerSavedPlaceEntity.create({
      passengerId: command.passengerId,
      kind: command.kind,
      location: {
        address: command.address,
        latitude: command.latitude,
        longitude: command.longitude,
      },
    });

    try {
      await this.repo.transaction(async () => this.repo.insert(place));
    } catch (error) {
      if (error instanceof ConflictException) {
        return Err(new SavedPlaceAlreadyExistsError(error));
      }
      throw error;
    }
    return Ok(place);
  }
}
