import { ApiProperty } from '@nestjs/swagger';
import { ResponseBase } from '@libs/api/response.base';

export class DriverResponseDto extends ResponseBase {
  @ApiProperty({
    example: 'firebase-uid-123',
    description: "Driver's user ID",
  })
  userId: string;
}
