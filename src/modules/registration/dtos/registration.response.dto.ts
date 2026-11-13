import { ApiProperty } from '@nestjs/swagger';
import { ResponseBase } from '@libs/api/response.base';
import { VehicleColor } from '@modules/registration/domain/registration.types';

// The vehicle given at the "Votre taxi" step, to fill the screen again.
export class RegistrationVehicleResponseDto {
  @ApiProperty({ example: 'Renault Austral' })
  model: string;

  @ApiProperty({ enum: VehicleColor, example: VehicleColor.grey })
  color: VehicleColor;

  @ApiProperty({ example: 'AB-123-CD' })
  plate: string;

  @ApiProperty({ example: '118' })
  adsNumber: string;

  @ApiProperty({ example: '67482' })
  communeCode: string;

  @ApiProperty({ example: 'Strasbourg' })
  communeName: string;

  @ApiProperty({ example: 4, description: 'Passenger seats, from 1 to 8' })
  passengerSeats: number;
}

export class RegistrationResponseDto extends ResponseBase {
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

  @ApiProperty({ type: RegistrationVehicleResponseDto, nullable: true })
  vehicle: RegistrationVehicleResponseDto | null;
}
