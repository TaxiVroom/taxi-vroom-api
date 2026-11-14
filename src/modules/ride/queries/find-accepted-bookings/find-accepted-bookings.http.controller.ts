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
import { DriverBookingPaginatedResponseDto } from '@modules/ride/dtos/driver-booking.paginated.response.dto';
import { DriverBooking } from '../find-available-bookings/find-available-bookings.query-handler';
import { FindAcceptedBookingsQuery } from './find-accepted-bookings.query-handler';

@Controller(routesV1.version)
export class FindAcceptedBookingsHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @ApiOperation({
    summary: 'The bookings the driver committed to, the soonest first',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: DriverBookingPaginatedResponseDto,
  })
  @Roles(UserRoles.driver)
  @Get(routesV1.booking.accepted)
  async findAcceptedBookings(
    @CurrentUser() user: RegisteredUser,
    @Query() queryParams: PaginatedQueryRequestDto,
  ): Promise<DriverBookingPaginatedResponseDto> {
    const bookings: Paginated<DriverBooking> = await this.queryBus.execute(
      new FindAcceptedBookingsQuery({
        driverId: user.id,
        limit: queryParams.limit,
        page: queryParams.page,
      }),
    );
    return new DriverBookingPaginatedResponseDto(bookings);
  }
}
