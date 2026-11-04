import { ApiProperty } from '@nestjs/swagger';
import {
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
