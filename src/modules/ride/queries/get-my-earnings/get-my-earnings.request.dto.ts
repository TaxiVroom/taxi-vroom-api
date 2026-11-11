import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { EarningsPeriod } from './get-my-earnings.query-handler';

export class GetMyEarningsRequestDto {
  @ApiProperty({ enum: EarningsPeriod, example: EarningsPeriod.week })
  @IsEnum(EarningsPeriod)
  readonly period: EarningsPeriod;
}
