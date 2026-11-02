import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterPushTokenRequestDto {
  @ApiProperty({ description: 'Firebase Cloud Messaging registration token' })
  @MaxLength(4096)
  @MinLength(1)
  @IsString()
  readonly token: string;
}
