import {
  ConflictException,
  Controller,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { match, Result } from 'oxide.ts';
import { routesV1 } from '@config/app.routes';
import { ApiErrorResponse } from '@libs/api/api-error.response';
import { CurrentUser } from '@modules/auth/current-user.decorator';
import { RegisteredUser } from '@modules/auth/domain/authenticated-user';
import { Roles } from '@modules/auth/roles.decorator';
import { UserRoles } from '@modules/user/domain/user.types';
import {
  RideBookingOverlapError,
  RideBookingTakenError,
  RideDriverDocumentsEndBeforeError,
  RideNotEnoughSeatsError,
  RideNotFoundError,
  RideWrongStepError,
} from '@modules/ride/domain/ride.errors';
import { AcceptBookingCommand } from './accept-booking.command';
import { AcceptBookingError } from './accept-booking.service';

@Controller(routesV1.version)
export class AcceptBookingHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @ApiOperation({ summary: 'The driver commits to a booking, in advance' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ApiErrorResponse })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description:
      'RIDE.BOOKING_TAKEN: another driver took it; RIDE.BOOKING_OVERLAP: ' +
      'another booking of this driver is less than an hour away; ' +
      'RIDE.NOT_ENOUGH_SEATS: more passengers than the taxi has seats ' +
      '(never shown by the app, which only lists the bookings that fit); ' +
      'RIDE.WRONG_STEP: not waiting for a driver anymore',
  })
  @Roles(UserRoles.driver)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post(routesV1.ride.acceptBooking)
  async accept(
    @CurrentUser() user: RegisteredUser,
    @Param('rideId') rideId: string,
  ): Promise<void> {
    const result: Result<void, AcceptBookingError> =
      await this.commandBus.execute(
        new AcceptBookingCommand({ rideId, driverId: user.id }),
      );

    return match(result, {
      Ok: () => undefined,
      Err: (error: Error) => {
        if (error instanceof RideNotFoundError) {
          throw new NotFoundException(error.message);
        }
        if (
          error instanceof RideBookingTakenError ||
          error instanceof RideBookingOverlapError ||
          error instanceof RideDriverDocumentsEndBeforeError ||
          error instanceof RideNotEnoughSeatsError ||
          error instanceof RideWrongStepError
        ) {
          throw new ConflictException({
            message: error.message,
            code: error.code,
          });
        }
        throw error;
      },
    });
  }
}
