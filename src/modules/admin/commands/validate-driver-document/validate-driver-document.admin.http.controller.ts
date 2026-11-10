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
import { Result } from 'oxide.ts';
import { routesV1 } from '@config/app.routes';
import { ApiErrorResponse } from '@libs/api/api-error.response';
import { endOfParisDay } from '@libs/utils/paris-day';
import { ValidateDriverDocumentCommand } from '@modules/driver/commands/validate-driver-document/validate-driver-document.command';
import { ValidateDriverDocumentError } from '@modules/driver/commands/validate-driver-document/validate-driver-document.service';
import {
  DriverDocumentSubmissionNotFoundError,
  DriverDocumentTypeNotFoundError,
} from '@modules/driver/domain/driver.errors';
import { ValidateDocumentRequestDto } from '../validate-document.request.dto';

// TODO: restrict to ADMIN role once the admin role is implemented, like the
// registration documents.
@Controller(routesV1.version)
export class ValidateDriverDocumentAdminHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @ApiOperation({ summary: "Validate a driver's renewed or new document" })
  @ApiResponse({ status: HttpStatus.OK })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ApiErrorResponse })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description: 'DRIVER.DOCUMENT_EXPIRY_REQUIRED or DRIVER.DOCUMENT_EXPIRED',
    type: ApiErrorResponse,
  })
  @Patch(routesV1.admin.validateDriverDocument)
  async validate(
    @Param('submissionId') submissionId: string,
    @Body() body: ValidateDocumentRequestDto,
  ): Promise<void> {
    const result: Result<null, ValidateDriverDocumentError> =
      await this.commandBus.execute(
        new ValidateDriverDocumentCommand({
          submissionId,
          expiresAt: body?.expiresAt
            ? endOfParisDay(body.expiresAt.slice(0, 10))
            : null,
        }),
      );
    if (result.isOk()) return;
    const error = result.unwrapErr();
    if (
      error instanceof DriverDocumentSubmissionNotFoundError ||
      error instanceof DriverDocumentTypeNotFoundError
    ) {
      throw new NotFoundException(error.message);
    }
    throw new UnprocessableEntityException({
      message: error.message,
      code: error.code,
    });
  }
}
