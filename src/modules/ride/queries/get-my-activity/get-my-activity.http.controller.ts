import { Controller, Get, HttpStatus } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { routesV1 } from '@config/app.routes';
import { CurrentUser } from '@modules/auth/current-user.decorator';
import { RegisteredUser } from '@modules/auth/domain/authenticated-user';
import { Roles } from '@modules/auth/roles.decorator';
import { UserRoles } from '@modules/user/domain/user.types';
import { DriverActivityResponseDto } from '@modules/ride/dtos/driver-activity.response.dto';
import {
  DriverEarningsReadModel,
  EarningsPeriod,
  GetMyEarningsQuery,
} from '@modules/ride/queries/get-my-earnings/get-my-earnings.query-handler';
import { GetMyRatingQuery } from '@modules/ride/queries/get-my-rating/get-my-rating.query-handler';
import { GetMyAcceptanceRateQuery } from '@modules/ride/queries/get-my-acceptance-rate/get-my-acceptance-rate.query-handler';

// The pill and the three figures of the driver's "Conduire" tab, read again
// on each arrival and after each ride. Spec docs/specs/gains-reels.md.
@Controller(routesV1.version)
export class GetMyActivityHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @ApiOperation({ summary: "The driver's figures on the Conduire tab" })
  @ApiResponse({ status: HttpStatus.OK, type: DriverActivityResponseDto })
  @Roles(UserRoles.driver)
  @Get(routesV1.driver.activity)
  async getMyActivity(
    @CurrentUser() user: RegisteredUser,
  ): Promise<DriverActivityResponseDto> {
    const driverId = user.id;
    const [today, week, averageRating, acceptanceRatePercent]: [
      DriverEarningsReadModel,
      DriverEarningsReadModel,
      number | null,
      number | null,
    ] = await Promise.all([
      this.queryBus.execute(
        new GetMyEarningsQuery({ driverId, period: EarningsPeriod.today }),
      ),
      this.queryBus.execute(
        new GetMyEarningsQuery({ driverId, period: EarningsPeriod.week }),
      ),
      this.queryBus.execute(new GetMyRatingQuery({ driverId })),
      this.queryBus.execute(new GetMyAcceptanceRateQuery({ driverId })),
    ]);
    const response = new DriverActivityResponseDto();
    response.todayEarningsCents = today.days.reduce(
      (total, day) => total + day.amountCents,
      0,
    );
    response.weekRideCount = week.rideCount;
    response.averageRating = averageRating;
    response.acceptanceRatePercent = acceptanceRatePercent;
    return response;
  }
}
