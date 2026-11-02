import { Controller, Get, HttpStatus, NotFoundException } from '@nestjs/common';
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
import { CurrentRideResponseDto } from '@modules/ride/dtos/current-ride.response.dto';
import {
  CurrentRide,
  FindCurrentRideQuery,
} from './find-current-ride.query-handler';

@Controller(routesV1.version)
export class FindCurrentRideHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @ApiOperation({ summary: "The user's ride in progress, to come back to it" })
  @ApiResponse({ status: HttpStatus.OK, type: CurrentRideResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ApiErrorResponse })
  @Roles(UserRoles.passenger, UserRoles.driver)
  @Get(routesV1.ride.current)
  async findCurrentRide(
    @CurrentUser() user: RegisteredUser,
  ): Promise<CurrentRideResponseDto> {
    const result: Result<CurrentRide, RideNotFoundError> =
      await this.queryBus.execute(
        new FindCurrentRideQuery({ userId: user.id }),
      );

    return match(result, {
      Ok: (ride: CurrentRide): CurrentRideResponseDto => ride,
      Err: (error: Error) => {
        throw new NotFoundException(error.message);
      },
    });
  }
}
