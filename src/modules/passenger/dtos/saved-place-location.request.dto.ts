import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

// The address and the point chosen in the app from Mapbox, kept as they
// are, like a ride's destination.
export class SavedPlaceLocationRequestDto {
  @ApiProperty({ example: '4 Rue de la Magel, 67000 Strasbourg, France' })
  @MaxLength(300)
  @MinLength(1)
  @IsString()
  readonly address: string;

  @ApiProperty({ example: 48.5833 })
  @Max(90)
  @Min(-90)
  @IsNumber()
  readonly latitude: number;

  @ApiProperty({ example: 7.7485 })
  @Max(180)
  @Min(-180)
  @IsNumber()
  readonly longitude: number;
}
