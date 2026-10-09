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
  RideNotAssignedToDriverError,
  RideNotFoundError,
  RideWrongStepError,
} from '@modules/ride/domain/ride.errors';
import { WithdrawFromRideCommand } from './withdraw-from-ride.command';
import { WithdrawFromRideError } from './withdraw-from-ride.service';

@Controller(routesV1.version)
export class WithdrawFromRideHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @ApiOperation({
    summary: 'The driver gives the ride up: it goes to the next driver',
  })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ApiErrorResponse })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, type: ApiErrorResponse })
  @ApiResponse({ status: HttpStatus.CONFLICT, type: ApiErrorResponse })
  @Roles(UserRoles.driver)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post(routesV1.ride.withdraw)
  async withdraw(
    @CurrentUser() user: RegisteredUser,
    @Param('rideId') rideId: string,
  ): Promise<void> {
    const result: Result<void, WithdrawFromRideError> =
      await this.commandBus.execute(
        new WithdrawFromRideCommand({ rideId, driverId: user.id }),
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
        if (error instanceof RideWrongStepError) {
          throw new ConflictException(error.message);
        }
        throw error;
      },
    });
  }
}
