import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { routesV1 } from '@config/app.routes';
import { CurrentUser } from '@modules/auth/current-user.decorator';
import { RegisteredUser } from '@modules/auth/domain/authenticated-user';
import { Roles } from '@modules/auth/roles.decorator';
import { UserRoles } from '@modules/user/domain/user.types';
import { DriverBookingResponseDto } from '@modules/ride/dtos/driver-booking.response.dto';
import {
  DriverBooking,
  FindAvailableBookingsQuery,
} from './find-available-bookings.query-handler';
import { FindAvailableBookingsRequestDto } from './find-available-bookings.request.dto';

@Controller(routesV1.version)
export class FindAvailableBookingsHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @ApiOperation({
    summary: 'Bookings without a driver, 20 km around the driver',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: DriverBookingResponseDto,
    isArray: true,
  })
  @Roles(UserRoles.driver)
  @Get(routesV1.booking.available)
  async findAvailableBookings(
    @CurrentUser() user: RegisteredUser,
    @Query() query: FindAvailableBookingsRequestDto,
  ): Promise<DriverBookingResponseDto[]> {
    const bookings: DriverBooking[] = await this.queryBus.execute(
      new FindAvailableBookingsQuery({
        driverId: user.id,
        latitude: query.latitude,
        longitude: query.longitude,
      }),
    );
    return bookings;
  }
}
