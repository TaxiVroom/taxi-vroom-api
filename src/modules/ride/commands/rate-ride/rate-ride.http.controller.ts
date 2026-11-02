import {
  Body,
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
  RideAlreadyRatedError,
  RideNotFoundError,
  RideNotOwnedByPassengerError,
  RideWrongStepError,
} from '@modules/ride/domain/ride.errors';
import { RateRideCommand } from './rate-ride.command';
import { RateRideRequestDto } from './rate-ride.request.dto';
import { RateRideError } from './rate-ride.service';

@Controller(routesV1.version)
export class RateRideHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @ApiOperation({ summary: 'The passenger rates the driver, once' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ApiErrorResponse })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, type: ApiErrorResponse })
  @ApiResponse({ status: HttpStatus.CONFLICT, type: ApiErrorResponse })
  @Roles(UserRoles.passenger)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post(routesV1.ride.rating)
  async rate(
    @CurrentUser() user: RegisteredUser,
    @Param('rideId') rideId: string,
    @Body() body: RateRideRequestDto,
  ): Promise<void> {
    const result: Result<void, RateRideError> = await this.commandBus.execute(
      new RateRideCommand({
        rideId,
        passengerId: user.id,
        stars: body.stars,
        compliments: body.compliments,
      }),
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
        if (
          error instanceof RideWrongStepError ||
          error instanceof RideAlreadyRatedError
        ) {
          throw new ConflictException(error.message);
        }
        throw error;
      },
    });
  }
}
