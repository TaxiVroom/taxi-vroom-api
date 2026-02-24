import { ApiProperty } from '@nestjs/swagger';
import { ResponseBase } from '@libs/api/response.base';

export class UserResponseDto extends ResponseBase {
  @ApiProperty({
    example: 'joh-doe@gmail.com',
    description: "User's email address",
  })
  email: string;

  @ApiProperty({
    example: '+33685456565',
    description: "User's phone number in E.164 format",
  })
  phone: string;

  @ApiProperty({
    example: 'Jean',
    description: "User's first name",
  })
  firstName: string;

  @ApiProperty({
    example: 'Dupont',
    description: "User's last name",
  })
  lastName: string;

  // @ApiProperty({ example: 'France', description: "User's country of residence" })
  // country: string;

  // @ApiProperty({ example: '123456', description: 'Postal code' })
  // postalCode: string;

  // @ApiProperty({ example: 'Park Avenue', description: 'Street where the user is registered' })
  // street: string;
}
