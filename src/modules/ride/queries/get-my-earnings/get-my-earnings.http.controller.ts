import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { routesV1 } from '@config/app.routes';
import { CurrentUser } from '@modules/auth/current-user.decorator';
import { RegisteredUser } from '@modules/auth/domain/authenticated-user';
import { Roles } from '@modules/auth/roles.decorator';
import { UserRoles } from '@modules/user/domain/user.types';
import { DriverEarningsResponseDto } from '@modules/ride/dtos/driver-earnings.response.dto';
import {
  DriverEarningsReadModel,
  GetMyEarningsQuery,
} from './get-my-earnings.query-handler';
import { GetMyEarningsRequestDto } from './get-my-earnings.request.dto';

// The driver's "Gains" tab. Spec docs/specs/gains-reels.md.
@Controller(routesV1.version)
export class GetMyEarningsHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @ApiOperation({ summary: "The driver's earnings over a period, by day" })
  @ApiResponse({ status: HttpStatus.OK, type: DriverEarningsResponseDto })
  @Roles(UserRoles.driver)
  @Get(routesV1.driver.earnings)
  async getMyEarnings(
    @CurrentUser() user: RegisteredUser,
    @Query() query: GetMyEarningsRequestDto,
  ): Promise<DriverEarningsResponseDto> {
    const earnings: DriverEarningsReadModel = await this.queryBus.execute(
      new GetMyEarningsQuery({ driverId: user.id, period: query.period }),
    );
    return DriverEarningsResponseDto.fromReadModel(earnings);
  }
}
