import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { None, Option, Some } from 'oxide.ts';
import { QueryBase } from '@libs/ddd/query.base';
import { PrismaService } from '@libs/db/prisma.service';

// The vehicle given at the "Votre taxi" step, as the driver module copies it
// when the driver is created.
export interface RegistrationVehicleReadModel {
  model: string;
  // A VehicleColor value, e.g. "GREY".
  color: string;
  plate: string;
  adsNumber: string;
  communeCode: string;
  communeName: string;
}

export class FindRegistrationVehicleQuery extends QueryBase {
  readonly userId: string;

  constructor(props: FindRegistrationVehicleQuery) {
    super();
    this.userId = props.userId;
  }
}

@QueryHandler(FindRegistrationVehicleQuery)
export class FindRegistrationVehicleQueryHandler implements IQueryHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    query: FindRegistrationVehicleQuery,
  ): Promise<Option<RegistrationVehicleReadModel>> {
    const vehicle = await this.prisma.driverRegistrationVehicle.findUnique({
      where: { driverRegId: query.userId },
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
