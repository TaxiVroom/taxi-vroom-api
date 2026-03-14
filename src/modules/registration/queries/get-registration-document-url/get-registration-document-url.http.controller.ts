import {
  Controller,
  Get,
  HttpStatus,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { QueryBus } from '@nestjs/cqrs';
import { match, Result } from 'oxide.ts';
import { routesV1 } from '@config/app.routes';
import { CurrentUser } from '@modules/auth/current-user.decorator';
import { GuestUser } from '@modules/auth/domain/authenticated-user';
import { ApiErrorResponse } from '@libs/api/api-error.response';
import { SignedDocumentUrlResponseDto } from '@modules/registration/dtos/registration-document.response.dto';
import { RegistrationDocumentNotFoundError } from '@modules/registration/domain/registration-document.errors';
import { GetRegistrationDocumentUrlQuery } from './get-registration-document-url.query-handler';

@Controller(routesV1.version)
export class GetRegistrationDocumentUrlHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @ApiOperation({
    summary:
      'Get a short-lived signed URL to view an uploaded registration document',
  })
  @ApiParam({ name: 'documentTypeId', type: String })
  @ApiQuery({ name: 'side', enum: ['front', 'back'] })
  @ApiResponse({ status: HttpStatus.OK, type: SignedDocumentUrlResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ApiErrorResponse })
  @Get(routesV1.registrationFlow.documentUrl)
  async getDocumentUrl(
    @Param('documentTypeId') documentTypeId: string,
    @Query('side') side: 'front' | 'back',
    @CurrentUser() user: GuestUser,
  ): Promise<SignedDocumentUrlResponseDto> {
    const result: Result<string, RegistrationDocumentNotFoundError> =
      await this.queryBus.execute(
        new GetRegistrationDocumentUrlQuery({
          driverRegId: user.id,
          documentTypeId,
          side,
        }),
      );

    return match(result, {
      Ok: (url: string) => {
        const response = new SignedDocumentUrlResponseDto();
        response.url = url;
        return response;
      },
      Err: (error: Error) => {
        if (error instanceof RegistrationDocumentNotFoundError) {
          throw new NotFoundException(error.message);
        }
        throw error;
      },
    });
  }
}
