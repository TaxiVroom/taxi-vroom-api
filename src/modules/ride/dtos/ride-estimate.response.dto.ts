import { ApiProperty } from '@nestjs/swagger';

// The tariffs of the arrêté, for the passenger to see how the price is made.
export class TaxiTariffResponseDto {
  @ApiProperty({ example: '67' })
  departmentCode: string;

  @ApiProperty({ example: '2026-02-01' })
  validFrom: string;

  @ApiProperty({ example: 'Arrêté préfectoral du 26 janvier 2026' })
  decree: string;

  @ApiProperty({ example: 310 })
  pickupCents: number;

  @ApiProperty({ example: 101 })
  kmCentsA: number;

  @ApiProperty({ example: 143 })
  kmCentsB: number;

  @ApiProperty({ example: 202 })
  kmCentsC: number;

  @ApiProperty({ example: 286 })
  kmCentsD: number;

  @ApiProperty({ example: 3780 })
  hourlyCents: number;

  @ApiProperty({ example: 800 })
  minimumFareCents: number;

  @ApiProperty({ example: 1140, description: 'Minutes since midnight' })
  nightStartMinute: number;

  @ApiProperty({ example: 420, description: 'Minutes since midnight' })
  nightEndMinute: number;
}

export class RideEstimateResponseDto {
  @ApiProperty({ example: '2cdc8ab1-6d50-49cc-ba14-54e4ac7ec231' })
  id: string;

  @ApiProperty({ example: 1240 })
  minPriceCents: number;

  @ApiProperty({ example: 1790 })
  maxPriceCents: number;

  @ApiProperty({ example: 4, description: 'Of the closest free taxi' })
  pickupEtaMinutes: number;

  @ApiProperty({ type: TaxiTariffResponseDto })
  tariff: TaxiTariffResponseDto;
}
