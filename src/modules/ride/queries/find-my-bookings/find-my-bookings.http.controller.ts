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
import { PassengerBookingPaginatedResponseDto } from '@modules/ride/dtos/passenger-booking.paginated.response.dto';
import {
  FindMyBookingsQuery,
  PassengerBooking,
} from './find-my-bookings.query-handler';

@Controller(routesV1.version)
export class FindMyBookingsHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @ApiOperation({
    summary: "The passenger's bookings not started yet, the soonest first",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: PassengerBookingPaginatedResponseDto,
  })
  @Roles(UserRoles.passenger)
  @Get(routesV1.ride.booked)
  async findMyBookings(
    @CurrentUser() user: RegisteredUser,
    @Query() queryParams: PaginatedQueryRequestDto,
  ): Promise<PassengerBookingPaginatedResponseDto> {
    const bookings: Paginated<PassengerBooking> = await this.queryBus.execute(
      new FindMyBookingsQuery({
        passengerId: user.id,
        limit: queryParams.limit,
        page: queryParams.page,
      }),
    );
    return new PassengerBookingPaginatedResponseDto(bookings);
  }
}
