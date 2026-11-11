import { Injectable } from '@nestjs/common';
import { Mapper } from '@libs/ddd';
import { PassengerSavedPlaceModel } from './database/passenger-saved-place.repository';
import { PassengerSavedPlaceEntity } from './domain/passenger-saved-place.entity';
import { SavedPlaceResponseDto } from './dtos/saved-place.response.dto';

@Injectable()
export class PassengerSavedPlaceMapper
  implements
    Mapper<
      PassengerSavedPlaceEntity,
      PassengerSavedPlaceModel,
      SavedPlaceResponseDto
    >
{
  toPersistence(entity: PassengerSavedPlaceEntity): PassengerSavedPlaceModel {
    const { passengerId, kind, address, latitude, longitude } =
      entity.getProps();
    return { passengerId, kind, address, latitude, longitude };
  }

  toDomain(record: PassengerSavedPlaceModel): PassengerSavedPlaceEntity {
    return PassengerSavedPlaceEntity.restore(record);
  }

  toResponse(entity: PassengerSavedPlaceEntity): SavedPlaceResponseDto {
    return SavedPlaceResponseDto.fromReadModel(entity.getProps());
  }
}
