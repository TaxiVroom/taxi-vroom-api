import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

// The supplements allowed depend on the city's fare rules, not known by the
// server yet: it takes them as the driver's app shows them.
export class RideSupplementRequestDto {
  @ApiProperty({ example: 'bulky-luggage' })
  @MaxLength(50)
  @MinLength(1)
  @IsString()
  readonly supplementId: string;

  @ApiProperty({ example: 'Bagage encombrant' })
  @MaxLength(100)
  @MinLength(1)
  @IsString()
  readonly label: string;

  @ApiProperty({ example: 200 })
  @Max(10_000)
  @Min(0)
  @IsInt()
  readonly unitPriceCents: number;

  @ApiProperty({ example: 2 })
  @Max(20)
  @Min(1)
  @IsInt()
  readonly quantity: number;
}

export class CompleteRideRequestDto {
  @ApiProperty({ example: 1840, description: 'What the meter showed' })
  @Max(1_000_000)
  @Min(0)
  @IsInt()
  readonly meterCents: number;

  @ApiProperty({ type: [RideSupplementRequestDto] })
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => RideSupplementRequestDto)
  @IsArray()
  readonly supplements: RideSupplementRequestDto[];
}
