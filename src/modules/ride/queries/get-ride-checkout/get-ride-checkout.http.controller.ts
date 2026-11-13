import {
  Controller,
  Get,
  HttpStatus,
  NotFoundException,
  Param,
} from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { match, Result } from 'oxide.ts';
import { routesV1 } from '@config/app.routes';
import { ApiErrorResponse } from '@libs/api/api-error.response';
import { CurrentUser } from '@modules/auth/current-user.decorator';
import { RegisteredUser } from '@modules/auth/domain/authenticated-user';
import { Roles } from '@modules/auth/roles.decorator';
import { UserRoles } from '@modules/user/domain/user.types';
import { RideNotFoundError } from '@modules/ride/domain/ride.errors';
import { RideCheckoutResponseDto } from '@modules/ride/dtos/ride-checkout.response.dto';
import {
  GetRideCheckoutQuery,
  RideCheckoutReadModel,
} from './get-ride-checkout.query-handler';

@Controller(routesV1.version)
export class GetRideCheckoutHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @ApiOperation({
    summary: 'The passengers and the passenger supplement, for the ride end',
  })
  @ApiResponse({ status: HttpStatus.OK, type: RideCheckoutResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ApiErrorResponse })
  @Roles(UserRoles.driver)
  @Get(routesV1.ride.checkout)
  async getCheckout(
    @CurrentUser() user: RegisteredUser,
    @Param('rideId') rideId: string,
  ): Promise<RideCheckoutResponseDto> {
    const result: Result<RideCheckoutReadModel, RideNotFoundError> =
      await this.queryBus.execute(
        new GetRideCheckoutQuery({ rideId, driverId: user.id }),
      );

    return match(result, {
      Ok: (checkout: RideCheckoutReadModel) => {
        const response = new RideCheckoutResponseDto();
        response.passengerCount = checkout.passengerCount;
        response.extraPassengerCents = checkout.extraPassengerCents;
        return response;
      },
      Err: (error: Error) => {
        if (error instanceof RideNotFoundError) {
          throw new NotFoundException(error.message);
        }
        throw error;
      },
    });
  }
}
