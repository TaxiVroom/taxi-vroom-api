import { ApiProperty } from '@nestjs/swagger';
import { SavedPlaceKind } from '@modules/passenger/domain/passenger-saved-place.types';
import { SavedPlaceReadModel } from '@modules/passenger/queries/find-my-saved-places/find-my-saved-places.query-handler';

export class SavedPlaceResponseDto {
  @ApiProperty({ enum: SavedPlaceKind, example: SavedPlaceKind.home })
  kind: SavedPlaceKind;

  @ApiProperty({ example: '3 Rue du Dôme 67000 Strasbourg' })
  address: string;

  @ApiProperty({ example: 48.5833 })
  latitude: number;

  @ApiProperty({ example: 7.7485 })
  longitude: number;

  static fromReadModel(place: SavedPlaceReadModel): SavedPlaceResponseDto {
    const response = new SavedPlaceResponseDto();
    response.kind = place.kind;
    response.address = place.address;
    response.latitude = place.latitude;
    response.longitude = place.longitude;
    return response;
  }
}
