import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { QueryBase } from '@libs/ddd/query.base';
import { PrismaService } from '@libs/db/prisma.service';
import { VehicleAvailability } from '@modules/registration/domain/registration.types';

export class CheckVehicleAvailabilityQuery extends QueryBase {
  readonly requestingUserId: string;
  // As saved, e.g. "AB-123-CD".
  readonly plate: string;
  readonly adsNumber: string;
  readonly communeCode: string;

  constructor(props: CheckVehicleAvailabilityQuery) {
    super();
    this.requestingUserId = props.requestingUserId;
    this.plate = props.plate;
    this.adsNumber = props.adsNumber;
    this.communeCode = props.communeCode;
  }
}

// Like the email: taken by a driver or by a registration in progress, the
// requesting user's own ignored. Spec docs/specs/vehicule-du-chauffeur.md,
// point 7.
@QueryHandler(CheckVehicleAvailabilityQuery)
export class CheckVehicleAvailabilityQueryHandler implements IQueryHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    query: CheckVehicleAvailabilityQuery,
  ): Promise<VehicleAvailability> {
    const sameVehicle = [
      { plate: query.plate },
      { communeCode: query.communeCode, adsNumber: query.adsNumber },
    ];
    const select = { plate: true, adsNumber: true, communeCode: true };
    const [driverVehicles, registrationVehicles] = await Promise.all([
      this.prisma.driverVehicle.findMany({
        where: { OR: sameVehicle, driverId: { not: query.requestingUserId } },
        select,
      }),
      this.prisma.driverRegistrationVehicle.findMany({
        where: {
          OR: sameVehicle,
          driverRegId: { not: query.requestingUserId },
        },
        select,
      }),
    ]);

    const others = [...driverVehicles, ...registrationVehicles];
    return {
      plateTaken: others.some((vehicle) => vehicle.plate === query.plate),
      licenceTaken: others.some(
        (vehicle) =>
          vehicle.communeCode === query.communeCode &&
          vehicle.adsNumber === query.adsNumber,
      ),
    };
  }
}
