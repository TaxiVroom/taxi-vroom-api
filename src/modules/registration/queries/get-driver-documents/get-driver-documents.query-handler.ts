import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { QueryBase } from '@libs/ddd/query.base';
import { PrismaService } from '@libs/db/prisma.service';
import { lastParisDayBefore } from '@libs/utils/paris-day';
import {
  DocumentReviewResultDto,
  UploadedDocumentResponseDto,
} from '@modules/registration/dtos/uploaded-document.response.dto';
import { DocumentStatus } from '@modules/registration/domain/registration-document.types';

export class GetDriverDocumentsQuery extends QueryBase {
  readonly driverRegId: string;

  constructor(props: GetDriverDocumentsQuery) {
    super();
    this.driverRegId = props.driverRegId;
  }
}

@QueryHandler(GetDriverDocumentsQuery)
export class GetDriverDocumentsQueryHandler implements IQueryHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    query: GetDriverDocumentsQuery,
  ): Promise<UploadedDocumentResponseDto[]> {
    const documents = await this.prisma.registrationDocument.findMany({
      where: { driverRegId: query.driverRegId },
      include: {
        // TODO: SWitch case pour include la bonne table en fonction du status, ou alors faire une 2ème requête prisma pour récup l'event en fonction du statut
        // Only REJECTED documents have a rejection event — included here to
        // avoid a second query when building the DTO.
        rejectionEvents: { orderBy: { rejectedAt: 'desc' }, take: 1 },
      },
    });

    return documents.map((doc) => {
      const dto = new UploadedDocumentResponseDto();
      dto.documentTypeId = doc.documentTypeId;
      dto.reviewResult = this.buildReviewResult(
        doc.status as unknown as DocumentStatus, // FIXME: Not use as unknown
        doc.rejectionEvents[0]?.reason ?? null,
      );
      // Shown again when the sheet opens. Spec
      // docs/specs/documents-du-chauffeur.md, point 2.
      dto.lastValidDay = doc.expiresAt
        ? lastParisDayBefore(doc.expiresAt)
        : null;
      return dto;
    });
  }

  private buildReviewResult(
    status: DocumentStatus,
    rejectionReason: string | null,
  ): DocumentReviewResultDto {
    if (status === DocumentStatus.REJECTED && rejectionReason) {
      return { status, rejectionReason };
    }
    return { status };
  }
}
