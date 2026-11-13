import { ApiProperty } from '@nestjs/swagger';

// The driver's vehicle, shown in the account tab.
export class DriverVehicleResponseDto {
  @ApiProperty({ example: 'Renault Austral' })
  model: string;

  @ApiProperty({
    example: 'GREY',
    description:
      'BLACK, WHITE, GREY, SILVER, BLUE, RED, GREEN, BEIGE, BROWN or OTHER',
  })
  color: string;

  @ApiProperty({ example: 'AB-123-CD' })
  plate: string;

  @ApiProperty({ example: '118', description: 'Autorisation de stationnement' })
  adsNumber: string;

  @ApiProperty({ example: '67482', description: 'INSEE code of the commune' })
  communeCode: string;

  @ApiProperty({ example: 'Strasbourg' })
  communeName: string;

  @ApiProperty({ example: 4, description: 'Passenger seats, from 1 to 8' })
  passengerSeats: number;
}
