import { ApiProperty } from '@nestjs/swagger';

// The driver's figures on the "Conduire" tab.
export class DriverActivityResponseDto {
  @ApiProperty({ example: 5430, description: 'Earned today, in Paris' })
  todayEarningsCents: number;

  @ApiProperty({ example: 16, description: 'Completed since Monday' })
  weekRideCount: number;

  @ApiProperty({
    example: 4.8,
    nullable: true,
    type: Number,
    description: 'Average of all ratings, null without any',
  })
  averageRating: number | null;

  @ApiProperty({
    example: 92,
    nullable: true,
    type: Number,
    description:
      'Share of the last 100 ride requests accepted, null under 10 requests',
  })
  acceptanceRatePercent: number | null;
}
