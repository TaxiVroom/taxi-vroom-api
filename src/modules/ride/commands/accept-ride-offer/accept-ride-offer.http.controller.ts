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
import { AggregateID } from '@libs/ddd';
import { CurrentUser } from '@modules/auth/current-user.decorator';
import { RegisteredUser } from '@modules/auth/domain/authenticated-user';
import { Roles } from '@modules/auth/roles.decorator';
import { UserRoles } from '@modules/user/domain/user.types';
import {
  RideNotFoundError,
  RideOfferNotPendingError,
} from '@modules/ride/domain/ride.errors';
import { AcceptRideOfferCommand } from './accept-ride-offer.command';

@Controller(routesV1.version)
export class AcceptRideOfferHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @ApiOperation({ summary: 'Accept the ride proposed to the driver' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ApiErrorResponse })
  @ApiResponse({ status: HttpStatus.CONFLICT, type: ApiErrorResponse })
  @Roles(UserRoles.driver)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post(routesV1.ride.accept)
  async accept(
    @CurrentUser() user: RegisteredUser,
    @Param('rideId') rideId: string,
  ): Promise<void> {
    const result: Result<
      AggregateID,
      RideNotFoundError | RideOfferNotPendingError
    > = await this.commandBus.execute(
      new AcceptRideOfferCommand({ rideId, driverId: user.id }),
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
