import { ApiProperty } from '@nestjs/swagger';

// A ride the passenger booked for later, not started yet.
export class PassengerBookingResponseDto {
  @ApiProperty({ example: '2cdc8ab1-6d50-49cc-ba14-54e4ac7ec231' })
  id: string;

  @ApiProperty({ example: '12 Rue du Général de Gaulle 67300 Schiltigheim' })
  originName: string;

  @ApiProperty({ example: 'Aéroport Strasbourg-Entzheim' })
  destinationName: string;

  @ApiProperty({ example: '2026-11-04T04:00:00.000Z' })
  pickupAt: Date;

  @ApiProperty({ example: 3800 })
  estimatedPriceMinCents: number;

  @ApiProperty({ example: 5200 })
  estimatedPriceMaxCents: number;

  @ApiProperty({
    example: 'Jean',
    nullable: true,
    description: 'Null while no driver committed to the booking',
  })
  driverFirstName: string | null;
}
