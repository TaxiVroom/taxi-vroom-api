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
  BoardingCodeLockedError,
  RideNotAssignedToDriverError,
  RideNotFoundError,
  RideWrongStepError,
  WrongBoardingCodeError,
} from '@modules/ride/domain/ride.errors';
import { StartRideCommand } from './start-ride.command';
import { StartRideRequestDto } from './start-ride.request.dto';
import { StartRideError } from './start-ride.service';

@Controller(routesV1.version)
export class StartRideHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @ApiOperation({
    summary: 'Start the ride with the boarding code the passenger told',
  })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ApiErrorResponse })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, type: ApiErrorResponse })
  @ApiResponse({ status: HttpStatus.CONFLICT, type: ApiErrorResponse })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description:
      'RIDE.WRONG_BOARDING_CODE (with attemptsLeft), or ' +
      'RIDE.BOARDING_CODE_LOCKED after too many wrong codes',
  })
  @Roles(UserRoles.driver)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post(routesV1.ride.start)
  async start(
    @CurrentUser() user: RegisteredUser,
    @Param('rideId') rideId: string,
    @Body() body: StartRideRequestDto,
  ): Promise<void> {
    const result: Result<void, StartRideError> = await this.commandBus.execute(
      new StartRideCommand({
        rideId,
        driverId: user.id,
        boardingCode: body.boardingCode,
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
        // Both refused the same way: the app tells them apart by their code
        // (see libs/exceptions/exception.codes.ts).
        if (error instanceof WrongBoardingCodeError) {
          throw new UnprocessableEntityException({
            message: error.message,
            code: error.code,
            attemptsLeft: error.attemptsLeft,
          });
        }
        if (error instanceof BoardingCodeLockedError) {
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
