import { ApiProperty } from '@nestjs/swagger';
import { PaginatedResponseDto } from '@src/libs/api/paginated.response.base';
import { DriverBookingResponseDto } from './driver-booking.response.dto';

export class DriverBookingPaginatedResponseDto extends PaginatedResponseDto<DriverBookingResponseDto> {
  @ApiProperty({ type: DriverBookingResponseDto, isArray: true })
  readonly data: readonly DriverBookingResponseDto[];
}
