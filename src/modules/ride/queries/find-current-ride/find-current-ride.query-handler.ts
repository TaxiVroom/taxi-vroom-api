import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import { PrismaService } from '@libs/db/prisma.service';
import { QueryBase } from '@libs/ddd/query.base';
import { RideNotFoundError } from '@modules/ride/domain/ride.errors';
import { RideOfferStatus, RideStatus } from '@src/generated/prisma/client';

export interface CurrentRide {
  id: string;
  status: RideStatus;
  arrivedAt: Date | null;
}

export class FindCurrentRideQuery extends QueryBase {
  readonly userId: string;

  constructor(props: FindCurrentRideQuery) {
    super();
    this.userId = props.userId;
  }
}

// The steps an app must come back to after being closed.
const currentStatuses = [
  RideStatus.SEARCHING_DRIVER,
  RideStatus.DRIVER_EN_ROUTE,
  RideStatus.DRIVER_ARRIVED,
  RideStatus.IN_PROGRESS,
];

// The ride a passenger ordered, or a driver accepted, and that is not over.
@QueryHandler(FindCurrentRideQuery)
export class FindCurrentRideQueryHandler implements IQueryHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    query: FindCurrentRideQuery,
  ): Promise<Result<CurrentRide, RideNotFoundError>> {
    const accepted = { status: RideOfferStatus.ACCEPTED };
    const ride = await this.prisma.ride.findFirst({
      where: {
        status: { in: currentStatuses },
        OR: [
          { passengerId: query.userId },
          { offers: { some: { ...accepted, driverId: query.userId } } },
        ],
      },
      select: {
        id: true,
        status: true,
        offers: {
          where: accepted,
          select: {
            acceptance: {
              select: { arrival: { select: { arrivedAt: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!ride) return Err(new RideNotFoundError());

    return Ok({
      id: ride.id,
      status: ride.status,
      arrivedAt: ride.offers[0]?.acceptance?.arrival?.arrivedAt ?? null,
    });
  }
}
