import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '@libs/db/prisma.service';
import { QueryBase } from '@libs/ddd/query.base';

export class FindMyRecentDestinationsQuery extends QueryBase {
  readonly passengerId: string;

  constructor(props: FindMyRecentDestinationsQuery) {
    super();
    this.passengerId = props.passengerId;
  }
}

export interface RecentDestination {
  name: string;
  latitude: number;
  longitude: number;
}

// The passenger's last 3 different destinations, from their completed
// rides, the most recent first. Spec docs/specs/destinations-recentes.md.
@QueryHandler(FindMyRecentDestinationsQuery)
export class FindMyRecentDestinationsQueryHandler implements IQueryHandler {
  private static readonly limit = 3;

  constructor(private readonly prisma: PrismaService) {}

  // Raw SQL: Prisma's distinct does not say which row it keeps nor whether
  // it applies before take. PostgreSQL's DISTINCT ON keeps the first row of
  // each name in the ORDER BY order, here the most recent ride
  // (https://www.postgresql.org/docs/current/sql-select.html#SQL-DISTINCT);
  // the outer query then orders those by date.
  async execute(
    query: FindMyRecentDestinationsQuery,
  ): Promise<RecentDestination[]> {
    return this.prisma.$queryRaw<RecentDestination[]>`
      SELECT name, latitude, longitude
      FROM (
        SELECT DISTINCT ON ("destinationName")
          "destinationName" AS name,
          "destinationLatitude" AS latitude,
          "destinationLongitude" AS longitude,
          "createdAt"
        FROM rides
        WHERE "passengerId" = ${query.passengerId}
          AND status = 'COMPLETED'
        ORDER BY "destinationName", "createdAt" DESC
      ) latest
      ORDER BY "createdAt" DESC
      LIMIT ${FindMyRecentDestinationsQueryHandler.limit}`;
  }
}
