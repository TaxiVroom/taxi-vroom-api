import {
  Controller,
  HttpStatus,
  NotFoundException,
  Post,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CommandBus } from '@nestjs/cqrs';
import { match, Result } from 'oxide.ts';
import { CurrentUser } from '@modules/auth/current-user.decorator';
import { GuestUser } from '@modules/auth/domain/authenticated-user';
import { routesV1 } from '@config/app.routes';
import { IdResponse } from '@libs/api/id.response.dto';
import { AggregateID } from '@libs/ddd';
import { ApiErrorResponse } from '@libs/api/api-error.response';
import {
  RegistrationNotFoundError,
  RegistrationNotCompleteError,
  RegistrationMissingPhoneError,
} from '@modules/registration/domain/registration.errors';
import { CompleteRegistrationCommand } from './complete-registration.command';

@Controller(routesV1.version)
export class CompleteRegistrationHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @ApiOperation({
    summary: 'Complete passenger registration and create user account',
  })
  @ApiResponse({ status: HttpStatus.OK, type: IdResponse })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ApiErrorResponse })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    type: ApiErrorResponse,
  })
  @Post(routesV1.passenger.root)
  async complete(@CurrentUser() user: GuestUser): Promise<IdResponse> {
    const result: Result<
      AggregateID,
      | RegistrationNotFoundError
      | RegistrationNotCompleteError
      | RegistrationMissingPhoneError
    > = await this.commandBus.execute(
      new CompleteRegistrationCommand({ userId: user.id }),
    );

    return match(result, {
      Ok: (id) => new IdResponse(id),
      Err: (error: Error) => {
        if (error instanceof RegistrationNotFoundError)
          throw new NotFoundException(error.message);
        if (
          error instanceof RegistrationNotCompleteError ||
          error instanceof RegistrationMissingPhoneError
        )
          throw new UnprocessableEntityException(error.message);
        throw error;
      },
    });
  }
}
