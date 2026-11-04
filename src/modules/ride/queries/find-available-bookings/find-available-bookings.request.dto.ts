import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, Max, Min } from 'class-validator';

// The driver's position: the bookings around it are shown.
export class FindAvailableBookingsRequestDto {
  @ApiProperty({ example: 48.5734 })
  @Max(90)
  @Min(-90)
  @IsNumber()
  @Type(() => Number)
  readonly latitude: number;

  @ApiProperty({ example: 7.7521 })
  @Max(180)
  @Min(-180)
  @IsNumber()
  @Type(() => Number)
  readonly longitude: number;
}
