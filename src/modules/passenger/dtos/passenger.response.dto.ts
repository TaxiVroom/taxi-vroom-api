import { ApiProperty } from '@nestjs/swagger';
import { ResponseBase } from '@libs/api/response.base';

export class PassengerResponseDto extends ResponseBase {
  @ApiProperty({
    example: 'firebase-uid-123',
    description: "Passenger's user ID",
  })
  userId: string;
}
