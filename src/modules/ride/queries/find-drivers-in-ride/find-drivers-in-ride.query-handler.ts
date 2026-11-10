import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '@libs/db/prisma.service';
import { QueryBase } from '@libs/ddd/query.base';
import { RideOfferStatus, RideStatus } from '@src/generated/prisma/client';

// Those of the drivers who are on their way, at the pickup or driving a
// passenger: their presence must stay, as the passenger follows it. One
// read for all. Spec docs/specs/documents-du-chauffeur.md, point 8.
export class FindDriversInRideQuery extends QueryBase {
  readonly driverIds: string[];
  // The ride that just ended, still active until its transaction is saved.
  readonly exceptRideId?: string;

  constructor(props: FindDriversInRideQuery) {
    super();
    this.driverIds = props.driverIds;
    this.exceptRideId = props.exceptRideId;
  }
}

@QueryHandler(FindDriversInRideQuery)
export class FindDriversInRideQueryHandler implements IQueryHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: FindDriversInRideQuery): Promise<Set<string>> {
    if (query.driverIds.length === 0) return new Set();
    const offers = await this.prisma.rideOffer.findMany({
      where: {
        driverId: { in: query.driverIds },
        status: RideOfferStatus.ACCEPTED,
        ...(query.exceptRideId && { rideId: { not: query.exceptRideId } }),
        ride: {
          status: {
            in: [
              RideStatus.DRIVER_EN_ROUTE,
              RideStatus.DRIVER_ARRIVED,
              RideStatus.IN_PROGRESS,
            ],
          },
        },
      },
      select: { driverId: true },
    });
    return new Set(offers.map((offer) => offer.driverId));
  }
}
