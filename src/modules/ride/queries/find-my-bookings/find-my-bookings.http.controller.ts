import { Controller, Get, HttpStatus } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { routesV1 } from '@config/app.routes';
import { CurrentUser } from '@modules/auth/current-user.decorator';
import { RegisteredUser } from '@modules/auth/domain/authenticated-user';
import { Roles } from '@modules/auth/roles.decorator';
import { UserRoles } from '@modules/user/domain/user.types';
import { PassengerBookingResponseDto } from '@modules/ride/dtos/passenger-booking.response.dto';
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
    type: PassengerBookingResponseDto,
    isArray: true,
  })
  @Roles(UserRoles.passenger)
  @Get(routesV1.ride.booked)
  async findMyBookings(
    @CurrentUser() user: RegisteredUser,
  ): Promise<PassengerBookingResponseDto[]> {
    const bookings: PassengerBooking[] = await this.queryBus.execute(
      new FindMyBookingsQuery({ passengerId: user.id }),
    );
    return bookings;
  }
}
