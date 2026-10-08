import { ApiProperty } from '@nestjs/swagger';
import { RideStatus } from '@modules/ride/domain/ride.types';

export class RideResponseDto {
  @ApiProperty({ example: '2cdc8ab1-6d50-49cc-ba14-54e4ac7ec231' })
  id: string;

  @ApiProperty({ enum: RideStatus, example: RideStatus.searchingDriver })
  status: RideStatus;
}
