import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { None, Option, Some } from 'oxide.ts';
import { QueryBase } from '@libs/ddd/query.base';
import { PrismaService } from '@libs/db/prisma.service';

// The vehicle as the account tab shows it; the controller maps it.
export interface DriverVehicleReadModel {
  model: string;
  color: string;
  plate: string;
  adsNumber: string;
  communeCode: string;
  communeName: string;
}

export class FindMyVehicleQuery extends QueryBase {
  readonly driverId: string;

  constructor(props: FindMyVehicleQuery) {
    super();
    this.driverId = props.driverId;
  }
}

// The "Compte" tab's vehicle (GET drivers/me/account). None for a driver
// registered before the "Votre taxi" step existed.
@QueryHandler(FindMyVehicleQuery)
export class FindMyVehicleQueryHandler implements IQueryHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    query: FindMyVehicleQuery,
  ): Promise<Option<DriverVehicleReadModel>> {
    const vehicle = await this.prisma.driverVehicle.findUnique({
      where: { driverId: query.driverId },
    });
    if (!vehicle) return None;
    return Some({
      model: vehicle.model,
      color: vehicle.color,
      plate: vehicle.plate,
      adsNumber: vehicle.adsNumber,
      communeCode: vehicle.communeCode,
      communeName: vehicle.communeName,
    });
  }
}
