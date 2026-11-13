import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { QueryBase } from '@libs/ddd/query.base';
import { PrismaService } from '@libs/db/prisma.service';

// The passenger seats of a driver's taxi. A driver without a vehicle (one
// registered before the "Votre taxi" step existed) has no entry: no seats are
// known, so no ride is offered to them.
export interface DriverSeatsReadModel {
  driverId: string;
  passengerSeats: number;
}

export class GetDriverSeatsQuery extends QueryBase {
  readonly driverIds: string[];

  constructor(props: GetDriverSeatsQuery) {
    super();
    this.driverIds = props.driverIds;
  }
}

// One read for all the drivers asked, used by the ride module to keep the
// taxis that fit the passengers. Spec docs/specs/nombre-de-passagers.md.
@QueryHandler(GetDriverSeatsQuery)
export class GetDriverSeatsQueryHandler implements IQueryHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetDriverSeatsQuery): Promise<DriverSeatsReadModel[]> {
    const vehicles = await this.prisma.driverVehicle.findMany({
      where: { driverId: { in: query.driverIds } },
      select: { driverId: true, passengerSeats: true },
    });
    return vehicles.map((vehicle) => ({
      driverId: vehicle.driverId,
      passengerSeats: vehicle.passengerSeats,
    }));
  }
}
