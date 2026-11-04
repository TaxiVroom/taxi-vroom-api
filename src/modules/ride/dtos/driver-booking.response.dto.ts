import { ApiProperty } from '@nestjs/swagger';

// A booking seen from a driver's side: no phone number, the driver gets it
// once the ride starts.
export class DriverBookingResponseDto {
  @ApiProperty({ example: '2cdc8ab1-6d50-49cc-ba14-54e4ac7ec231' })
  id: string;

  @ApiProperty({ example: '2026-11-04T04:00:00.000Z' })
  pickupAt: Date;

  @ApiProperty({ example: '12 Rue du Général de Gaulle 67300 Schiltigheim' })
  originName: string;

  @ApiProperty({ example: 'Aéroport Strasbourg-Entzheim' })
  destinationName: string;

  @ApiProperty({
    example: 14800,
    description: 'By road, pickup to destination',
  })
  tripMeters: number;

  @ApiProperty({ example: 3800 })
  estimatedPriceMinCents: number;

  @ApiProperty({ example: 5200 })
  estimatedPriceMaxCents: number;

  @ApiProperty({ example: 'Léa' })
  passengerFirstName: string;

  @ApiProperty({
    example: false,
    description:
      'Its deadline passed and it is theirs: "Je pars" instead of "Se désister"',
  })
  canDepart: boolean;
}
