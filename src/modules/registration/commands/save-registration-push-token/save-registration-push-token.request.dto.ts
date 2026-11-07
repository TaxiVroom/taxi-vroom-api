import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class SaveRegistrationPushTokenRequestDto {
  @ApiProperty({
    example: 'fX3k9...',
    description: 'Firebase Cloud Messaging registration token of the phone',
  })
  @MaxLength(4096)
  @MinLength(1)
  @IsString()
  readonly token: string;
}
