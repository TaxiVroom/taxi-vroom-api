import {
  Controller,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { match, Result } from 'oxide.ts';
import { routesV1 } from '@config/app.routes';
import { ApiErrorResponse } from '@libs/api/api-error.response';
import { RegistrationDocumentNotFoundError } from '@modules/registration/domain/registration-document.errors';
import { RegistrationNotFoundError } from '@modules/registration/domain/registration.errors';
import { ValidateRegistrationDocumentCommand } from '@modules/registration/commands/validate-registration-document/validate-registration-document.command';

// TODO: restrict to ADMIN role once the admin role is implemented (@Roles(UserRoles.admin))
@Controller(routesV1.version)
export class ValidateRegistrationDocumentAdminHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @ApiOperation({ summary: 'Validate a driver registration document' })
  @ApiResponse({ status: HttpStatus.OK })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ApiErrorResponse })
  @Patch(routesV1.admin.validateRegistrationDocument)
  async validate(@Param('documentId') documentId: string): Promise<void> {
    const result: Result<
      void,
      RegistrationDocumentNotFoundError | RegistrationNotFoundError
    > = await this.commandBus.execute(
      new ValidateRegistrationDocumentCommand({ documentId }),
    );

    return match(result, {
      Ok: () => undefined,
      Err: (error: Error) => {
        if (
          error instanceof RegistrationDocumentNotFoundError ||
          error instanceof RegistrationNotFoundError
        ) {
          throw new NotFoundException(error.message);
        }
        throw error;
      },
    });
  }
}
