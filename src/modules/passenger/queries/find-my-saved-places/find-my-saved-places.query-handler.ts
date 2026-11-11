import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '@libs/db/prisma.service';
import { QueryBase } from '@libs/ddd/query.base';
import { SavedPlaceKind } from '@modules/passenger/domain/passenger-saved-place.types';

export interface SavedPlaceReadModel {
  kind: SavedPlaceKind;
  address: string;
  latitude: number;
  longitude: number;
}

export class FindMySavedPlacesQuery extends QueryBase {
  readonly passengerId: string;

  constructor(passengerId: string) {
    super();
    this.passengerId = passengerId;
  }
}

// "Maison" then "Travail", only those set.
@QueryHandler(FindMySavedPlacesQuery)
export class FindMySavedPlacesQueryHandler implements IQueryHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: FindMySavedPlacesQuery): Promise<SavedPlaceReadModel[]> {
    const rows = await this.prisma.passengerSavedPlace.findMany({
      where: { passengerId: query.passengerId },
      select: { kind: true, address: true, latitude: true, longitude: true },
      orderBy: { kind: 'asc' },
    });
    return rows.map((row) => ({ ...row, kind: row.kind as SavedPlaceKind }));
  }
}
