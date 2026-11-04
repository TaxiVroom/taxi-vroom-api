import {
  ConflictException,
  Controller,
  ForbiddenException,
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
  RideDriverBusyError,
  RideNotAssignedToDriverError,
  RideNotFoundError,
  RideWrongStepError,
} from '@modules/ride/domain/ride.errors';
import { DepartForBookingCommand } from './depart-for-booking.command';
import { DepartForBookingError } from './depart-for-booking.service';

@Controller(routesV1.version)
export class DepartForBookingHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @ApiOperation({
    summary: '"Je pars": the committed driver leaves for the booking',
  })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ApiErrorResponse })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, type: ApiErrorResponse })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description:
      'RIDE.WRONG_STEP: before the deadline, or already left; ' +
      'RIDE.DRIVER_BUSY: still on another ride',
  })
  @Roles(UserRoles.driver)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post(routesV1.ride.departForBooking)
  async depart(
    @CurrentUser() user: RegisteredUser,
    @Param('rideId') rideId: string,
  ): Promise<void> {
    const result: Result<void, DepartForBookingError> =
      await this.commandBus.execute(
        new DepartForBookingCommand({ rideId, driverId: user.id }),
      );

    return match(result, {
      Ok: () => undefined,
      Err: (error: Error) => {
        if (error instanceof RideNotFoundError) {
          throw new NotFoundException(error.message);
        }
        if (error instanceof RideNotAssignedToDriverError) {
          throw new ForbiddenException(error.message);
        }
        if (
          error instanceof RideWrongStepError ||
          error instanceof RideDriverBusyError
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
