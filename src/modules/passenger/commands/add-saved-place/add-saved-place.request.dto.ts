import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { SavedPlaceKind } from '@modules/passenger/domain/passenger-saved-place.types';
import { SavedPlaceLocationRequestDto } from '@modules/passenger/dtos/saved-place-location.request.dto';

export class AddSavedPlaceRequestDto extends SavedPlaceLocationRequestDto {
  @ApiProperty({ enum: SavedPlaceKind, example: SavedPlaceKind.home })
  @IsEnum(SavedPlaceKind)
  readonly kind: SavedPlaceKind;
}
