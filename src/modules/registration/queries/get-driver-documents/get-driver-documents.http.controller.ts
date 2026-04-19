import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { QueryBus } from '@nestjs/cqrs';
import { routesV1 } from '@config/app.routes';
import { CurrentUser } from '@modules/auth/current-user.decorator';
import { GuestUser } from '@modules/auth/domain/authenticated-user';
import { UploadedDocumentResponseDto } from '@modules/registration/dtos/uploaded-document.response.dto';
import { GetDriverDocumentsQuery } from './get-driver-documents.query-handler';

@Controller(routesV1.version)
export class GetDriverDocumentsHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @ApiOperation({
    summary: 'Get all documents already uploaded by the authenticated driver',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: UploadedDocumentResponseDto,
    isArray: true,
  })
  @Get(routesV1.registrationFlow.documents)
  getDriverDocuments(
    @CurrentUser() user: GuestUser,
  ): Promise<UploadedDocumentResponseDto[]> {
    return this.queryBus.execute(
      new GetDriverDocumentsQuery({ driverRegId: user.id }),
    );
  }
}
