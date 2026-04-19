import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  DriverRegistrationStep,
  PassengerRegistrationStep,
  RegistrationStep,
} from '@modules/registration/domain/registration.types';

// All valid step values across all registration flows.
const allRegistrationSteps = [
  ...Object.values(PassengerRegistrationStep),
  ...Object.values(DriverRegistrationStep),
] as const;

export class UpdateRegistrationRequestDto {
  @ApiProperty({
    enum: allRegistrationSteps,
    example: PassengerRegistrationStep.EMAIL,
  })
  @IsIn(allRegistrationSteps)
  readonly fromStep: RegistrationStep;

  @ApiProperty({ example: 'jean@gmail.com' })
  @MaxLength(320)
  @IsEmail()
  @IsOptional()
  readonly email?: string;

  @ApiProperty({ example: 'Jean' })
  @MaxLength(50)
  @MinLength(2)
  @IsString()
  @IsOptional()
  readonly firstName?: string;

  @ApiProperty({ example: 'Dupont' })
  @MaxLength(50)
  @MinLength(2)
  @IsString()
  @IsOptional()
  readonly lastName?: string;
}
