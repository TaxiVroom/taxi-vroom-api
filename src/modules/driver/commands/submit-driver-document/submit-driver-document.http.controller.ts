import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  UnprocessableEntityException,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Result } from 'oxide.ts';
import { routesV1 } from '@config/app.routes';
import { ApiErrorResponse } from '@libs/api/api-error.response';
import { endOfParisDay } from '@libs/utils/paris-day';
import { CurrentUser } from '@modules/auth/current-user.decorator';
import { RegisteredUser } from '@modules/auth/domain/authenticated-user';
import { Roles } from '@modules/auth/roles.decorator';
import { UserRoles } from '@modules/user/domain/user.types';
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
} from '@modules/registration/commands/submit-registration-documents/submit-registration-documents.request.dto';
import {
  DriverDocumentBackRequiredError,
  DriverDocumentTypeNotFoundError,
  DriverUnsupportedFileTypeError,
} from '@modules/driver/domain/driver.errors';
import { SubmitDriverDocumentCommand } from './submit-driver-document.command';
import { SubmitDriverDocumentRequestDto } from './submit-driver-document.request.dto';
import { SubmitDriverDocumentError } from './submit-driver-document.service';

@Controller(routesV1.version)
export class SubmitDriverDocumentHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @ApiOperation({ summary: 'Send a renewed or new document' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, type: ApiErrorResponse })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ApiErrorResponse })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description: 'DRIVER.DOCUMENT_EXPIRY_REQUIRED or DRIVER.DOCUMENT_EXPIRED',
    type: ApiErrorResponse,
  })
  @Roles(UserRoles.driver)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post(routesV1.driver.document)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'front', maxCount: 1 },
        { name: 'back', maxCount: 1 },
      ],
      {
        limits: { fileSize: MAX_FILE_SIZE_BYTES },
        fileFilter: (_req, file, callback) =>
          ALLOWED_MIME_TYPES.includes(file.mimetype)
            ? callback(null, true)
            : callback(new BadRequestException('Unsupported file type'), false),
      },
    ),
  )
  async submit(
    @Param('documentTypeId') documentTypeId: string,
    @UploadedFiles()
    files: { front?: Express.Multer.File[]; back?: Express.Multer.File[] },
    @Body() body: SubmitDriverDocumentRequestDto,
    @CurrentUser() user: RegisteredUser,
  ): Promise<void> {
    const front = files.front?.[0];
    if (!front) throw new BadRequestException('The front side is required');
    const back = files.back?.[0];
    const result: Result<null, SubmitDriverDocumentError> =
      await this.commandBus.execute(
        new SubmitDriverDocumentCommand({
          driverId: user.id,
          documentTypeId,
          frontFile: { buffer: front.buffer, mimeType: front.mimetype },
          backFile: back
            ? { buffer: back.buffer, mimeType: back.mimetype }
            : null,
          expiresAt: body.expiresAt
            ? endOfParisDay(body.expiresAt.slice(0, 10))
            : null,
        }),
      );
    if (result.isOk()) return;
    const error = result.unwrapErr();
    if (error instanceof DriverDocumentTypeNotFoundError) {
      throw new NotFoundException(error.message);
    }
    if (
      error instanceof DriverDocumentBackRequiredError ||
      error instanceof DriverUnsupportedFileTypeError
    ) {
      throw new BadRequestException({
        message: error.message,
        code: error.code,
      });
    }
    throw new UnprocessableEntityException({
      message: error.message,
      code: error.code,
    });
  }
}
