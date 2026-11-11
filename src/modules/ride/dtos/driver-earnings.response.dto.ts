import { ApiProperty } from '@nestjs/swagger';
import { DriverEarningsReadModel } from '@modules/ride/queries/get-my-earnings/get-my-earnings.query-handler';

export class DayEarningsResponseDto {
  @ApiProperty({ example: '2026-11-11', description: 'A day in Paris' })
  day: string;

  @ApiProperty({ example: 5430, description: 'Meters plus supplements' })
  amountCents: number;
}

// The "Gains" tab: every day of the period, in order.
export class DriverEarningsResponseDto {
  @ApiProperty({ type: DayEarningsResponseDto, isArray: true })
  days: DayEarningsResponseDto[];

  @ApiProperty({ example: 16, description: 'Completed rides' })
  rideCount: number;

  static fromReadModel(
    earnings: DriverEarningsReadModel,
  ): DriverEarningsResponseDto {
    const response = new DriverEarningsResponseDto();
    response.days = earnings.days.map((day) => {
      const dayResponse = new DayEarningsResponseDto();
      dayResponse.day = day.day;
      dayResponse.amountCents = day.amountCents;
      return dayResponse;
    });
    response.rideCount = earnings.rideCount;
    return response;
  }
}
