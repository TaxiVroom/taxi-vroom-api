import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

export class StartRideRequestDto {
  @ApiProperty({ example: '4817', description: 'Told by the passenger' })
  @Matches(/^\d{4}$/)
  readonly boardingCode: string;
}
