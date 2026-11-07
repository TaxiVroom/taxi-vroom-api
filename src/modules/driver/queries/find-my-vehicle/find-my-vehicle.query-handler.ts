import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { None, Option, Some } from 'oxide.ts';
import { QueryBase } from '@libs/ddd/query.base';
import { PrismaService } from '@libs/db/prisma.service';
import { DriverVehicleResponseDto } from '@modules/driver/dtos/driver-vehicle.response.dto';

export class FindMyVehicleQuery extends QueryBase {
  readonly driverId: string;

  constructor(props: FindMyVehicleQuery) {
    super();
    this.driverId = props.driverId;
  }
}

// The account tab's vehicle. None for a driver registered before the
// "Votre taxi" step existed.
@QueryHandler(FindMyVehicleQuery)
export class FindMyVehicleQueryHandler implements IQueryHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    query: FindMyVehicleQuery,
  ): Promise<Option<DriverVehicleResponseDto>> {
    const vehicle = await this.prisma.driverVehicle.findUnique({
      where: { driverId: query.driverId },
    });
    if (!vehicle) return None;
    const response = new DriverVehicleResponseDto();
    response.model = vehicle.model;
    response.color = vehicle.color;
    response.plate = vehicle.plate;
    response.adsNumber = vehicle.adsNumber;
    response.communeCode = vehicle.communeCode;
    response.communeName = vehicle.communeName;
    return Some(response);
  }
}
