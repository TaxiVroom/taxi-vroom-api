import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsPhoneNumber } from 'class-validator';
import { RegistrationRole } from '@modules/registration/domain/registration.types';

export class GetOrCreateRegistrationRequestDto {
  @ApiProperty({ enum: RegistrationRole, example: RegistrationRole.passenger })
  @IsEnum(RegistrationRole)
  readonly role: RegistrationRole;

  @ApiProperty({ example: '+33685456565' })
  @IsPhoneNumber()
  readonly phone: string;
}
