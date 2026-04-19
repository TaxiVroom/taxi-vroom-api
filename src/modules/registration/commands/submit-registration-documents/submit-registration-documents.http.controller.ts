import {
  BadRequestException,
  Body,
  Controller,
  HttpStatus,
  Logger,
  NotFoundException,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CommandBus } from '@nestjs/cqrs';
import { match, Result } from 'oxide.ts';
import { routesV1 } from '@config/app.routes';
import { CurrentUser } from '@modules/auth/current-user.decorator';
import { GuestUser } from '@modules/auth/domain/authenticated-user';
import { ApiErrorResponse } from '@libs/api/api-error.response';
import { RegistrationDocumentResponseDto } from '@modules/registration/dtos/registration-document.response.dto';
import {
  DocumentBackRequiredError,
  DocumentTypeNotFoundError,
  UnsupportedFileTypeError,
} from '@modules/registration/domain/registration-document.errors';
import { RegistrationNotFoundError } from '@modules/registration/domain/registration.errors';
import { SubmitRegistrationDocumentsCommand } from './submit-registration-documents.command';
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  SubmitRegistrationDocumentsRequestDto,
} from './submit-registration-documents.request.dto';

@Controller(routesV1.version)
export class SubmitRegistrationDocumentsHttpController {
  private readonly logger = new Logger(
    SubmitRegistrationDocumentsHttpController.name,
  );

  constructor(private readonly commandBus: CommandBus) {}

  @ApiOperation({ summary: 'Upload a document for driver registration' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: HttpStatus.CREATED,
    type: RegistrationDocumentResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, type: ApiErrorResponse })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ApiErrorResponse })
  @Post(routesV1.registrationFlow.documents)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'front', maxCount: 1 },
        { name: 'back', maxCount: 1 },
      ],
      {
        limits: { fileSize: MAX_FILE_SIZE_BYTES },
        fileFilter: (_req, file, callback) => {
          if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            callback(null, true);
          } else {
            callback(
              new BadRequestException(
                `Unsupported file type "${
                  file.mimetype
                }". Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
              ),
              false,
            );
          }
        },
      },
    ),
  )
  async submitDocuments(
    @UploadedFiles()
    files: { front: Express.Multer.File[]; back?: Express.Multer.File[] },
    @Body() body: SubmitRegistrationDocumentsRequestDto,
    @CurrentUser() user: GuestUser,
  ): Promise<RegistrationDocumentResponseDto> {
    this.logger.log(
      `[submitDocuments] Requête reçue — userId=${user.id}, documentTypeId=${body.documentTypeId}`,
    );
    this.logger.log(
      `[submitDocuments] Fichiers reçus : ${JSON.stringify({
        front: files.front?.map((f) => ({
          mimetype: f.mimetype,
          size: f.size,
        })),
        back: files.back?.map((f) => ({ mimetype: f.mimetype, size: f.size })),
      })}`,
    );

    const frontFile = files.front?.[0] ?? null;
    if (frontFile) {
      this.logger.log(
        `[submitDocuments] Fichier front OK — mimetype=${frontFile.mimetype}, taille=${frontFile.size} octets, bufferLength=${frontFile.buffer?.length}`,
      );
    } else {
      this.logger.log('[submitDocuments] Pas de fichier front dans la requête');
    }

    const backFile = files?.back?.[0] ?? null;
    if (backFile) {
      this.logger.log(
        `[submitDocuments] Fichier back présent — mimetype=${backFile.mimetype}, taille=${backFile.size} octets, bufferLength=${backFile.buffer?.length}`,
      );
    } else {
      this.logger.log('[submitDocuments] Pas de fichier back dans la requête');
    }

    this.logger.log(
      '[submitDocuments] Dispatch de la commande SubmitRegistrationDocumentsCommand...',
    );
    const result: Result<
      void,
      | RegistrationNotFoundError
      | DocumentTypeNotFoundError
      | DocumentBackRequiredError
      | UnsupportedFileTypeError
    > = await this.commandBus.execute(
      new SubmitRegistrationDocumentsCommand({
        userId: user.id,
        documentTypeId: body.documentTypeId,
        frontFile: frontFile
          ? { buffer: frontFile.buffer, mimeType: frontFile.mimetype }
          : null,
        backFile: backFile
          ? { buffer: backFile.buffer, mimeType: backFile.mimetype }
          : null,
      }),
    );

    this.logger.log(
      `[submitDocuments] Résultat de la commande : isOk=${result.isOk()}`,
    );

    return match(result, {
      Ok: () => {
        this.logger.log('[submitDocuments] Commande réussie — réponse 201');
        return new RegistrationDocumentResponseDto();
      },
      Err: (error: Error) => {
        this.logger.error(
          `[submitDocuments] La commande a retourné une erreur : ${error.constructor.name} — ${error.message}`,
        );
        if (error instanceof RegistrationNotFoundError) {
          throw new NotFoundException(error.message);
        }
        if (
          error instanceof DocumentTypeNotFoundError ||
          error instanceof DocumentBackRequiredError ||
          error instanceof UnsupportedFileTypeError
        ) {
          throw new BadRequestException(error.message);
        }
        throw error;
      },
    });
  }
}
