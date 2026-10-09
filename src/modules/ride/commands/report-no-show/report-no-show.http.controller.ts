import {
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
  NoShowTooEarlyError,
  RideNotAssignedToDriverError,
  RideNotFoundError,
  RideWrongStepError,
} from '@modules/ride/domain/ride.errors';
import { ReportNoShowCommand } from './report-no-show.command';
import { ReportNoShowError } from './report-no-show.service';

@Controller(routesV1.version)
export class ReportNoShowHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @ApiOperation({ summary: 'The passenger never came to the pickup' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ApiErrorResponse })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, type: ApiErrorResponse })
  @ApiResponse({ status: HttpStatus.CONFLICT, type: ApiErrorResponse })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description: 'RIDE.NO_SHOW_TOO_EARLY: 5 minutes after the arrival',
  })
  @Roles(UserRoles.driver)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post(routesV1.ride.noShow)
  async report(
    @CurrentUser() user: RegisteredUser,
    @Param('rideId') rideId: string,
  ): Promise<void> {
    const result: Result<void, ReportNoShowError> =
      await this.commandBus.execute(
        new ReportNoShowCommand({ rideId, driverId: user.id }),
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
        if (error instanceof NoShowTooEarlyError) {
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
