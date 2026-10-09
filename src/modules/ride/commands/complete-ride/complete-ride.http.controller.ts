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
  RideNotAssignedToDriverError,
  RideNotFoundError,
  RideWrongStepError,
} from '@modules/ride/domain/ride.errors';
import { CompleteRideCommand } from './complete-ride.command';
import { CompleteRideRequestDto } from './complete-ride.request.dto';
import { CompleteRideError } from './complete-ride.service';

@Controller(routesV1.version)
export class CompleteRideHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @ApiOperation({ summary: 'End the ride with what the meter showed' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ApiErrorResponse })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, type: ApiErrorResponse })
  @ApiResponse({ status: HttpStatus.CONFLICT, type: ApiErrorResponse })
  @Roles(UserRoles.driver)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post(routesV1.ride.complete)
  async complete(
    @CurrentUser() user: RegisteredUser,
    @Param('rideId') rideId: string,
    @Body() body: CompleteRideRequestDto,
  ): Promise<void> {
    const result: Result<void, CompleteRideError> =
      await this.commandBus.execute(
        new CompleteRideCommand({
          rideId,
          driverId: user.id,
          meterCents: body.meterCents,
          // Whitelisted: only these fields reach the domain.
          supplements: body.supplements.map((s) => ({
            supplementId: s.supplementId,
            label: s.label,
            unitPriceCents: s.unitPriceCents,
            quantity: s.quantity,
          })),
        }),
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
