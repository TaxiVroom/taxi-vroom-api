import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class CheckEmailAvailabilityRequestDto {
  @ApiProperty({ example: 'jean@gmail.com' })
  @IsEmail()
  readonly email: string;
}
