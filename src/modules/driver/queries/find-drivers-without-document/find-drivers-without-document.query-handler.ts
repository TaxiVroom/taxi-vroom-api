import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { QueryBase } from '@libs/ddd/query.base';
import { PrismaService } from '@libs/db/prisma.service';

// The drivers who have no valid document of this type, in one read.
export class FindDriversWithoutDocumentQuery extends QueryBase {
  readonly documentTypeId: string;

  constructor(props: FindDriversWithoutDocumentQuery) {
    super();
    this.documentTypeId = props.documentTypeId;
  }
}

@QueryHandler(FindDriversWithoutDocumentQuery)
export class FindDriversWithoutDocumentQueryHandler implements IQueryHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: FindDriversWithoutDocumentQuery): Promise<string[]> {
    const drivers = await this.prisma.driver.findMany({
      where: { documents: { none: { documentTypeId: query.documentTypeId } } },
      select: { userId: true },
    });
    return drivers.map((driver) => driver.userId);
  }
}
