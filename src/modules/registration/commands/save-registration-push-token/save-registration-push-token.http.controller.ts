import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Put,
} from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CommandBus } from '@nestjs/cqrs';
import { match, Result } from 'oxide.ts';
import { routesV1 } from '@config/app.routes';
import { ApiErrorResponse } from '@libs/api/api-error.response';
import { CurrentUser } from '@modules/auth/current-user.decorator';
import { GuestUser } from '@modules/auth/domain/authenticated-user';
import { RegistrationNotFoundError } from '@modules/registration/domain/registration.errors';
import { SaveRegistrationPushTokenCommand } from './save-registration-push-token.command';
import { SaveRegistrationPushTokenRequestDto } from './save-registration-push-token.request.dto';

@Controller(routesV1.version)
export class SaveRegistrationPushTokenHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @ApiOperation({
    summary:
      "The phone's notification token, before the account exists: told " +
      'when the documents are validated',
  })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ApiErrorResponse })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Put(routesV1.registrationFlow.pushToken)
  async save(
    @Body() body: SaveRegistrationPushTokenRequestDto,
    @CurrentUser() user: GuestUser,
  ): Promise<void> {
    const result: Result<void, RegistrationNotFoundError> =
      await this.commandBus.execute(
        new SaveRegistrationPushTokenCommand({
          userId: user.id,
          token: body.token,
        }),
      );
    match(result, {
      Ok: () => undefined,
      Err: (error: RegistrationNotFoundError) => {
        throw new NotFoundException(error.message);
      },
    });
  }
}
