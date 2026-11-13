import { ApiProperty } from '@nestjs/swagger';

// What the driver fills the end of the ride with.
export class RideCheckoutResponseDto {
  @ApiProperty({ example: 6, description: 'How many people travel, 1 to 8' })
  passengerCount: number;

  @ApiProperty({
    example: 400,
    description:
      'The supplement for each passenger from the fifth, in the tariff the ' +
      'ride was estimated with',
  })
  extraPassengerCents: number;
}
