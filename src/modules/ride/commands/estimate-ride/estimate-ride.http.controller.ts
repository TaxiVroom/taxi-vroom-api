import {
  BadRequestException,
  Body,
  Controller,
  HttpStatus,
  Post,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { match, Result } from 'oxide.ts';
import { routesV1 } from '@config/app.routes';
import { CurrentUser } from '@modules/auth/current-user.decorator';
import { RegisteredUser } from '@modules/auth/domain/authenticated-user';
import { Roles } from '@modules/auth/roles.decorator';
import { UserRoles } from '@modules/user/domain/user.types';
import {
  NoDriverAvailableError,
  RideAreaNotServedError,
  RidePickupTimeNotBookableError,
} from '@modules/ride/domain/ride.errors';
import { RideEstimateResponseDto } from '@modules/ride/dtos/ride-estimate.response.dto';
import { RideMapper } from '@modules/ride/ride.mapper';
import { EstimateRideCommand } from './estimate-ride.command';
import { EstimateRideRequestDto } from './estimate-ride.request.dto';
import { EstimateRideError, RideEstimate } from './estimate-ride.service';

@Controller(routesV1.version)
export class EstimateRideHttpController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly mapper: RideMapper,
  ) {}

  @ApiOperation({
    summary: 'Price a ride from the closest free taxi, before ordering it',
  })
  @ApiResponse({ status: HttpStatus.CREATED, type: RideEstimateResponseDto })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description:
      'RIDE.AREA_NOT_SERVED: no tariffs for the département yet; ' +
      'RIDE.NO_DRIVER_AVAILABLE: no free taxi within reach, for a ride now',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description:
      'RIDE.PICKUP_TIME_NOT_BOOKABLE: pickupAt not 30 min to 30 days ahead',
  })
  @Roles(UserRoles.passenger)
  @Post(routesV1.ride.root)
  async estimate(
    @CurrentUser() user: RegisteredUser,
    @Body() body: EstimateRideRequestDto,
  ): Promise<RideEstimateResponseDto> {
    const result: Result<RideEstimate, EstimateRideError> =
      await this.commandBus.execute(
        new EstimateRideCommand({
          passengerId: user.id,
          origin: {
            latitude: body.originLatitude,
            longitude: body.originLongitude,
          },
          originName: body.originName,
          destination: {
            name: body.destinationName,
            latitude: body.destinationLatitude,
            longitude: body.destinationLongitude,
          },
          pickupAt: body.pickupAt ? new Date(body.pickupAt) : undefined,
        }),
      );

    return match(result, {
      Ok: ({ ride, tariff, approachSeconds }: RideEstimate) =>
        this.mapper.toEstimateResponse(ride, tariff, approachSeconds),
      Err: (error: Error) => {
        if (error instanceof RidePickupTimeNotBookableError) {
          throw new BadRequestException({
            message: error.message,
            code: error.code,
          });
        }
        if (
          error instanceof RideAreaNotServedError ||
          error instanceof NoDriverAvailableError
        ) {
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
