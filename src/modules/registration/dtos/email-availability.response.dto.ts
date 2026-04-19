import { ApiProperty } from '@nestjs/swagger';

export class EmailAvailabilityResponseDto {
  @ApiProperty()
  isAvailable: boolean;
}
