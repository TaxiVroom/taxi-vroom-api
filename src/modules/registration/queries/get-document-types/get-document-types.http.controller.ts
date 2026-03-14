import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { QueryBus } from '@nestjs/cqrs';
import { routesV1 } from '@config/app.routes';
import { DocumentTypeResponseDto } from '@modules/registration/dtos/document-type.response.dto';
import { GetDocumentTypesQuery } from './get-document-types.query-handler';

@Controller(routesV1.version)
export class GetDocumentTypesHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @ApiOperation({
    summary: 'List all document types required for driver registration',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: DocumentTypeResponseDto,
    isArray: true,
  })
  @Get(routesV1.registrationDocumentType.root)
  async getDocumentTypes(): Promise<DocumentTypeResponseDto[]> {
    return this.queryBus.execute(new GetDocumentTypesQuery());
  }
}
