import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { QueryBase } from '@libs/ddd/query.base';
import { PrismaService } from '@libs/db/prisma.service';
import { DocumentStatus } from '@modules/registration/domain/registration-document.types';

// A validated document of the registration, as the driver module copies it
// when the driver is created. Spec docs/specs/inscription-chauffeur.md.
export interface RegistrationDocumentReadModel {
  documentTypeId: string;
  frontFilePath: string;
  backFilePath: string | null;
}

export class FindRegistrationDocumentsQuery extends QueryBase {
  readonly userId: string;

  constructor(props: FindRegistrationDocumentsQuery) {
    super();
    this.userId = props.userId;
  }
}

@QueryHandler(FindRegistrationDocumentsQuery)
export class FindRegistrationDocumentsQueryHandler implements IQueryHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    query: FindRegistrationDocumentsQuery,
  ): Promise<RegistrationDocumentReadModel[]> {
    const documents = await this.prisma.registrationDocument.findMany({
      where: { driverRegId: query.userId, status: DocumentStatus.VALIDATED },
      select: {
        documentTypeId: true,
        frontFilePath: true,
        backFilePath: true,
      },
    });
    return documents.map((document) => ({
      documentTypeId: document.documentTypeId,
      frontFilePath: document.frontFilePath,
      backFilePath: document.backFilePath,
    }));
  }
}
