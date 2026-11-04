import {
  BadRequestException,
  ConflictException,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  UnprocessableEntityException,
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
  RideEstimateExpiredError,
  RideNotFoundError,
  RideNotOwnedByPassengerError,
  RidePickupTimeNotBookableError,
  RideWrongStepError,
} from '@modules/ride/domain/ride.errors';
import { BookRideCommand } from './book-ride.command';
import { BookRideError } from './book-ride.service';

@Controller(routesV1.version)
export class BookRideHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @ApiOperation({
    summary: 'Book the ride estimated for later, at its estimated price',
  })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ApiErrorResponse })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, type: ApiErrorResponse })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'RIDE.WRONG_STEP: not a ride estimated for later',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'RIDE.PICKUP_TIME_NOT_BOOKABLE: the pickup got too close',
  })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description: 'RIDE.ESTIMATE_EXPIRED: 5 minutes after the estimate',
  })
  @Roles(UserRoles.passenger)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post(routesV1.ride.book)
  async book(
    @CurrentUser() user: RegisteredUser,
    @Param('rideId') rideId: string,
  ): Promise<void> {
    const result: Result<void, BookRideError> = await this.commandBus.execute(
      new BookRideCommand({ rideId, passengerId: user.id }),
    );

    return match(result, {
      Ok: () => undefined,
      Err: (error: Error) => {
        if (error instanceof RideNotFoundError) {
          throw new NotFoundException(error.message);
        }
        if (error instanceof RideNotOwnedByPassengerError) {
          throw new ForbiddenException(error.message);
        }
        if (error instanceof RideWrongStepError) {
          throw new ConflictException(error.message);
        }
        if (error instanceof RidePickupTimeNotBookableError) {
          throw new BadRequestException({
            message: error.message,
            code: error.code,
          });
        }
        if (error instanceof RideEstimateExpiredError) {
          throw new UnprocessableEntityException({
            message: error.message,
            code: error.code,
          });
        }
        throw error;
      },
    });
  }
}
