import { ApiProperty } from '@nestjs/swagger';
import {
  // IsAlphanumeric,
  IsEmail,
  IsEnum,
  IsPhoneNumber,
  IsString,
  // Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserRoles } from '@modules/user/domain/user.types';

export class CreateUserRequestDto {
  @ApiProperty({
    example: 'john@gmail.com',
    description: 'User email address',
  })
  @MaxLength(320)
  @MinLength(5)
  @IsEmail()
  readonly email: string;

  @ApiProperty({
    example: '+33685456565',
    description: 'Phone number in E.164 format',
  })
  @IsPhoneNumber()
  readonly phone: string;

  @ApiProperty({ example: 'Jean', description: 'First name' })
  @MaxLength(50)
  @MinLength(2)
  @IsString()
  readonly firstName: string;

  @ApiProperty({ example: 'Dupont', description: 'Last name' })
  @MaxLength(50)
  @MinLength(2)
  @IsString()
  readonly lastName: string;

  @ApiProperty({ example: 'PASSENGER', enum: UserRoles })
  @IsEnum(UserRoles)
  readonly role: UserRoles;

  // @ApiProperty({ example: 'France', description: 'Country of residence' })
  // @MaxLength(50) @MinLength(4) @IsString() @Matches(/^[a-zA-Z ]*$/)
  // readonly country: string;

  // @ApiProperty({ example: '28566', description: 'Postal code' })
  // @MaxLength(10) @MinLength(4) @IsAlphanumeric()
  // readonly postalCode: string;

  // @ApiProperty({ example: 'Grande Rue', description: 'Street' })
  // @MaxLength(50) @MinLength(5) @Matches(/^[a-zA-Z ]*$/)
  // readonly street: string;
}
