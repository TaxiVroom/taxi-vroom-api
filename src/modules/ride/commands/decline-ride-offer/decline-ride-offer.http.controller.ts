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
  RideNotFoundError,
  RideOfferNotPendingError,
} from '@modules/ride/domain/ride.errors';
import { DeclineRideOfferCommand } from './decline-ride-offer.command';

@Controller(routesV1.version)
export class DeclineRideOfferHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @ApiOperation({
    summary: 'Decline the ride proposed to the driver: it goes to the next one',
  })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ApiErrorResponse })
  @ApiResponse({ status: HttpStatus.CONFLICT, type: ApiErrorResponse })
  @Roles(UserRoles.driver)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post(routesV1.ride.decline)
  async decline(
    @CurrentUser() user: RegisteredUser,
    @Param('rideId') rideId: string,
  ): Promise<void> {
    const result: Result<void, RideNotFoundError | RideOfferNotPendingError> =
      await this.commandBus.execute(
        new DeclineRideOfferCommand({ rideId, driverId: user.id }),
      );

    return match(result, {
      Ok: () => undefined,
      Err: (error: Error) => {
        if (error instanceof RideNotFoundError) {
          throw new NotFoundException(error.message);
        }
        if (error instanceof RideOfferNotPendingError) {
          throw new ConflictException(error.message);
        }
        throw error;
      },
    });
  }
}
