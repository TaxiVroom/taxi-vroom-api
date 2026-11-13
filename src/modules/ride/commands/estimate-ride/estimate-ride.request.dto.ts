import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class EstimateRideRequestDto {
  @ApiProperty({
    example: 3,
    description:
      'How many people travel, from 1 to 8: a taxi has eight seats at most ' +
      '(article L3121-1 du code des transports). The price counts a ' +
      'supplement for each passenger from the fifth.',
  })
  @Max(8)
  @Min(1)
  @IsInt()
  readonly passengerCount: number;

  @ApiProperty({ example: 48.5734 })
  @Max(90)
  @Min(-90)
  @IsNumber()
  readonly originLatitude: number;

  @ApiProperty({ example: 7.7521 })
  @Max(180)
  @Min(-180)
  @IsNumber()
  readonly originLongitude: number;

  @ApiProperty({
    example: '4 Rue de la Magel, 67000 Strasbourg, France',
    required: false,
    description:
      'The pickup address found by the app on Mapbox; without it, the ' +
      'pickup is named "Position de départ".',
  })
  @IsOptional()
  @MaxLength(300)
  @MinLength(1)
  @IsString()
  readonly originName?: string;

  @ApiProperty({ example: 'Gare de Strasbourg' })
  @MaxLength(200)
  @MinLength(1)
  @IsString()
  readonly destinationName: string;

  @ApiProperty({ example: 48.5851 })
  @Max(90)
  @Min(-90)
  @IsNumber()
  readonly destinationLatitude: number;

  @ApiProperty({ example: 7.7346 })
  @Max(180)
  @Min(-180)
  @IsNumber()
  readonly destinationLongitude: number;

  @ApiProperty({
    example: '2026-11-04T04:00:00.000Z',
    required: false,
    description:
      'To book for later, from 30 minutes to 30 days ahead. Without it, ' +
      'the ride is for now.',
  })
  @IsOptional()
  @IsISO8601({ strict: true })
  readonly pickupAt?: string;
}
