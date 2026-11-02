import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { routesV1 } from '@config/app.routes';
import { PaginatedQueryRequestDto } from '@libs/api/paginated-query.request.dto';
import { Paginated } from '@libs/ddd';
import { CurrentUser } from '@modules/auth/current-user.decorator';
import { RegisteredUser } from '@modules/auth/domain/authenticated-user';
import { Roles } from '@modules/auth/roles.decorator';
import { UserRoles } from '@modules/user/domain/user.types';
import { PastRidePaginatedResponseDto } from '@modules/ride/dtos/past-ride.paginated.response.dto';
import { FindMyRidesQuery, PastRide } from './find-my-rides.query-handler';

@Controller(routesV1.version)
export class FindMyRidesHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @ApiOperation({ summary: "The passenger's finished rides, latest first" })
  @ApiResponse({ status: HttpStatus.OK, type: PastRidePaginatedResponseDto })
  @Roles(UserRoles.passenger)
  @Get(routesV1.ride.root)
  async findMyRides(
    @CurrentUser() user: RegisteredUser,
    @Query() queryParams: PaginatedQueryRequestDto,
  ): Promise<PastRidePaginatedResponseDto> {
    const rides: Paginated<PastRide> = await this.queryBus.execute(
      new FindMyRidesQuery({
        passengerId: user.id,
        limit: queryParams.limit,
        page: queryParams.page,
      }),
    );
    return new PastRidePaginatedResponseDto(rides);
  }
}
