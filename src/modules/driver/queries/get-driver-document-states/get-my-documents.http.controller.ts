import { Controller, Get, HttpStatus } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { routesV1 } from '@config/app.routes';
import { CurrentUser } from '@modules/auth/current-user.decorator';
import { RegisteredUser } from '@modules/auth/domain/authenticated-user';
import { Roles } from '@modules/auth/roles.decorator';
import { UserRoles } from '@modules/user/domain/user.types';
import { DriverDocumentsResponseDto } from '@modules/driver/dtos/driver-document.response.dto';
import {
  DriverDocumentStatesReadModel,
  GetDriverDocumentStatesQuery,
} from './get-driver-document-states.query-handler';

// "Vos documents": the state of each document type. Spec
// docs/specs/documents-du-chauffeur.md.
@Controller(routesV1.version)
export class GetMyDocumentsHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @ApiOperation({ summary: "The state of the driver's documents" })
  @ApiResponse({ status: HttpStatus.OK, type: DriverDocumentsResponseDto })
  @Roles(UserRoles.driver)
  @Get(routesV1.driver.documents)
  async findMine(
    @CurrentUser() user: RegisteredUser,
  ): Promise<DriverDocumentsResponseDto> {
    const [states]: DriverDocumentStatesReadModel[] =
      await this.queryBus.execute(
        new GetDriverDocumentStatesQuery({ driverIds: [user.id] }),
      );
    return {
      documents: states.documents.map((document) => ({
        documentTypeId: document.documentTypeId,
        name: document.name,
        backRequired: document.backRequired,
        expires: document.expires,
        state: document.state,
        expiresAt: document.expiresAt?.toISOString() ?? null,
        lastValidDay: document.lastValidDay,
        requiredFrom: document.requiredFrom?.toISOString() ?? null,
        inReview: document.inReview,
      })),
      isBlocked: states.isBlocked,
      inOrderUntil: states.inOrderUntil?.toISOString() ?? null,
    };
  }
}
