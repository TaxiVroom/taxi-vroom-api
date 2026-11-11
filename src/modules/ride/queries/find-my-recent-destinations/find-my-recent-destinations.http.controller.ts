import { Controller, Get, HttpStatus } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { routesV1 } from '@config/app.routes';
import { CurrentUser } from '@modules/auth/current-user.decorator';
import { RegisteredUser } from '@modules/auth/domain/authenticated-user';
import { Roles } from '@modules/auth/roles.decorator';
import { UserRoles } from '@modules/user/domain/user.types';
import { RecentDestinationResponseDto } from '@modules/ride/dtos/recent-destination.response.dto';
import {
  FindMyRecentDestinationsQuery,
  RecentDestination,
} from './find-my-recent-destinations.query-handler';

@Controller(routesV1.version)
export class FindMyRecentDestinationsHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @ApiOperation({
    summary: "The passenger's last 3 different destinations, latest first",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: RecentDestinationResponseDto,
    isArray: true,
  })
  @Roles(UserRoles.passenger)
  @Get(routesV1.ride.recentDestinations)
  async findMyRecentDestinations(
    @CurrentUser() user: RegisteredUser,
  ): Promise<RecentDestinationResponseDto[]> {
    const destinations: RecentDestination[] = await this.queryBus.execute(
      new FindMyRecentDestinationsQuery({ passengerId: user.id }),
    );
    return destinations.map((destination) =>
      RecentDestinationResponseDto.fromReadModel(destination),
    );
  }
}
