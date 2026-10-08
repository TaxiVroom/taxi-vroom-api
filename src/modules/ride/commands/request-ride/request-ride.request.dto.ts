import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNumber,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class RequestRideRequestDto {
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

  // The estimate shown to the passenger: the real price comes from the meter.
  @ApiProperty({ example: 700 })
  @Min(0)
  @IsInt()
  readonly estimatedPriceMinCents: number;

  @ApiProperty({ example: 900 })
  @Min(0)
  @IsInt()
  readonly estimatedPriceMaxCents: number;
}
