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
  RideNotFoundError,
  RideNotOwnedByPassengerError,
  RideWrongStepError,
} from '@modules/ride/domain/ride.errors';
import { CancelRideCommand } from './cancel-ride.command';
import { CancelRideError } from './cancel-ride.service';

@Controller(routesV1.version)
export class CancelRideHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @ApiOperation({ summary: 'The passenger cancels the ride, for good' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ApiErrorResponse })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, type: ApiErrorResponse })
  @ApiResponse({ status: HttpStatus.CONFLICT, type: ApiErrorResponse })
  @Roles(UserRoles.passenger)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post(routesV1.ride.cancel)
  async cancel(
    @CurrentUser() user: RegisteredUser,
    @Param('rideId') rideId: string,
  ): Promise<void> {
    const result: Result<void, CancelRideError> = await this.commandBus.execute(
      new CancelRideCommand({ rideId, passengerId: user.id }),
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
        throw error;
      },
    });
  }
}
