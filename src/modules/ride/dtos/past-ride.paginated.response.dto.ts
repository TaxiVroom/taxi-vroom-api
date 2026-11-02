import { ApiProperty } from '@nestjs/swagger';
import { PaginatedResponseDto } from '@src/libs/api/paginated.response.base';

export class PastRideResponseDto {
  @ApiProperty({ example: '2cdc8ab1-6d50-49cc-ba14-54e4ac7ec231' })
  id: string;

  @ApiProperty({ example: '3 Rue du Dôme 67000 Strasbourg' })
  originName: string;

  @ApiProperty({ example: 'Gare de Strasbourg' })
  destinationName: string;

  @ApiProperty({ example: '2026-10-22T08:07:16.017Z' })
  startedAt: Date;

  @ApiProperty({ example: 3120, description: 'The meter and the supplements' })
  totalCents: number;
}

export class PastRidePaginatedResponseDto extends PaginatedResponseDto<PastRideResponseDto> {
  @ApiProperty({ type: PastRideResponseDto, isArray: true })
  readonly data: readonly PastRideResponseDto[];
}
