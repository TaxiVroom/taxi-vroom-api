import {
  Body,
  Controller,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { match, Result } from 'oxide.ts';
import { routesV1 } from '@config/app.routes';
import { ApiErrorResponse } from '@libs/api/api-error.response';
import { Roles } from '@modules/auth/roles.decorator';
import { UserRoles } from '@modules/user/domain/user.types';
import { endOfParisDay } from '@libs/utils/paris-day';
import {
  DocumentExpiredError,
  DocumentExpiryRequiredError,
  DocumentTypeNotFoundError,
  RegistrationDocumentNotFoundError,
} from '@modules/registration/domain/registration-document.errors';
import { RegistrationNotFoundError } from '@modules/registration/domain/registration.errors';
import { ValidateRegistrationDocumentCommand } from '@modules/registration/commands/validate-registration-document/validate-registration-document.command';
import { ValidateRegistrationDocumentError } from '@modules/registration/commands/validate-registration-document/validate-registration-document.service';
import { ValidateDocumentRequestDto } from '../validate-document.request.dto';

@Controller(routesV1.version)
export class ValidateRegistrationDocumentAdminHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @ApiOperation({ summary: 'Validate a driver registration document' })
  @ApiResponse({ status: HttpStatus.OK })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ApiErrorResponse })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description:
      'REGISTRATION_DOCUMENT.EXPIRY_REQUIRED or REGISTRATION_DOCUMENT.EXPIRED',
    type: ApiErrorResponse,
  })
  @Roles(UserRoles.admin)
  @Patch(routesV1.admin.validateRegistrationDocument)
  async validate(
    @Param('documentId') documentId: string,
    @Body() body: ValidateDocumentRequestDto,
  ): Promise<void> {
    const result: Result<void, ValidateRegistrationDocumentError> =
      await this.commandBus.execute(
        new ValidateRegistrationDocumentCommand({
          documentId,
          expiresAt: body?.expiresAt
            ? endOfParisDay(body.expiresAt.slice(0, 10))
            : null,
        }),
      );

    return match(result, {
      Ok: () => undefined,
      Err: (error: Error) => {
        if (
          error instanceof RegistrationDocumentNotFoundError ||
          error instanceof RegistrationNotFoundError ||
          error instanceof DocumentTypeNotFoundError
        ) {
          throw new NotFoundException(error.message);
        }
        if (
          error instanceof DocumentExpiryRequiredError ||
          error instanceof DocumentExpiredError
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
