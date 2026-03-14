import { ApiProperty } from '@nestjs/swagger';
import { ResponseBase } from '@libs/api/response.base';

export class PassengerRegistrationResponseDto extends ResponseBase {
  @ApiProperty()
  role: string;

  @ApiProperty()
  currentStep: string;

  @ApiProperty({ nullable: true })
  email: string | null;

  @ApiProperty({ nullable: true })
  firstName: string | null;

  @ApiProperty({ nullable: true })
  lastName: string | null;
}
