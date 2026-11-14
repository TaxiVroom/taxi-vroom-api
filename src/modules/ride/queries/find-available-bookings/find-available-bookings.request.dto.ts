import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, Max, Min } from 'class-validator';
import { PaginatedQueryRequestDto } from '@libs/api/paginated-query.request.dto';

// The driver's position: the bookings around it are shown, page by page.
export class FindAvailableBookingsRequestDto extends PaginatedQueryRequestDto {
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
