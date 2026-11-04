import { Controller, Get, HttpStatus } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { routesV1 } from '@config/app.routes';
import { CurrentUser } from '@modules/auth/current-user.decorator';
import { RegisteredUser } from '@modules/auth/domain/authenticated-user';
import { Roles } from '@modules/auth/roles.decorator';
import { UserRoles } from '@modules/user/domain/user.types';
import { DriverBookingResponseDto } from '@modules/ride/dtos/driver-booking.response.dto';
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
    type: DriverBookingResponseDto,
    isArray: true,
  })
  @Roles(UserRoles.driver)
  @Get(routesV1.booking.accepted)
  async findAcceptedBookings(
    @CurrentUser() user: RegisteredUser,
  ): Promise<DriverBookingResponseDto[]> {
    const bookings: DriverBooking[] = await this.queryBus.execute(
      new FindAcceptedBookingsQuery({ driverId: user.id }),
    );
    return bookings;
  }
}
