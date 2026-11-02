import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsEnum, IsInt, Max, Min } from 'class-validator';
import { RideCompliment } from '@modules/ride/domain/ride.types';

export class RateRideRequestDto {
  @ApiProperty({ example: 5 })
  @Max(5)
  @Min(1)
  @IsInt()
  readonly stars: number;

  @ApiProperty({ enum: RideCompliment, isArray: true })
  @IsEnum(RideCompliment, { each: true })
  @ArrayUnique()
  @IsArray()
  readonly compliments: RideCompliment[];
}
