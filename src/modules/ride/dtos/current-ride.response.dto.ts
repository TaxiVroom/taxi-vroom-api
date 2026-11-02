import { ApiProperty } from '@nestjs/swagger';

export class CurrentRideResponseDto {
  @ApiProperty({ example: '2cdc8ab1-6d50-49cc-ba14-54e4ac7ec231' })
  id: string;

  @ApiProperty({ example: 'DRIVER_ARRIVED' })
  status: string;

  @ApiProperty({
    example: '2026-10-22T08:07:16.017Z',
    nullable: true,
    description: 'Once the driver arrived at the pickup',
  })
  arrivedAt: Date | null;
}
