import { Option } from 'oxide.ts';
import { RepositoryPort } from '@libs/ddd';
import { PassengerSavedPlaceEntity } from '../domain/passenger-saved-place.entity';
import { SavedPlaceKind } from '../domain/passenger-saved-place.types';

export interface PassengerSavedPlaceRepositoryPort
  extends RepositoryPort<PassengerSavedPlaceEntity> {
  findOne(
    passengerId: string,
    kind: SavedPlaceKind,
  ): Promise<Option<PassengerSavedPlaceEntity>>;

  // Writes the new point and address of an existing place.
  save(place: PassengerSavedPlaceEntity): Promise<void>;
}
