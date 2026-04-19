import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { QueryBase } from '@libs/ddd/query.base';
import { PrismaService } from '@libs/db/prisma.service';
import { DocumentTypeResponseDto } from '@modules/registration/dtos/document-type.response.dto';

export class GetDocumentTypesQuery extends QueryBase {}

@QueryHandler(GetDocumentTypesQuery)
export class GetDocumentTypesQueryHandler implements IQueryHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(): Promise<DocumentTypeResponseDto[]> {
    return this.prisma.documentType.findMany({
      select: { id: true, name: true, backRequired: true },
      orderBy: { name: 'asc' },
    });
  }
}
