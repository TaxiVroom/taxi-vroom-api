import { ApiProperty } from '@nestjs/swagger';
import { PaginatedResponseDto } from '@src/libs/api/paginated.response.base';
import { PassengerBookingResponseDto } from './passenger-booking.response.dto';

export class PassengerBookingPaginatedResponseDto extends PaginatedResponseDto<PassengerBookingResponseDto> {
  @ApiProperty({ type: PassengerBookingResponseDto, isArray: true })
  readonly data: readonly PassengerBookingResponseDto[];
}
