import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '@libs/db/prisma.service';
import { QueryBase } from '@libs/ddd/query.base';
import { RideKind, RideStatus } from '@src/generated/prisma/client';

export class FindMyBookingsQuery extends QueryBase {
  readonly passengerId: string;

  constructor(props: FindMyBookingsQuery) {
    super();
    this.passengerId = props.passengerId;
  }
}

export interface PassengerBooking {
  id: string;
  originName: string;
  destinationName: string;
  pickupAt: Date;
  estimatedPriceMinCents: number;
  estimatedPriceMaxCents: number;
  driverFirstName: string | null;
}

// The passenger's bookings not started yet, the soonest first.
@QueryHandler(FindMyBookingsQuery)
export class FindMyBookingsQueryHandler implements IQueryHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: FindMyBookingsQuery): Promise<PassengerBooking[]> {
    const rides = await this.prisma.ride.findMany({
      where: {
        passengerId: query.passengerId,
        kind: RideKind.SCHEDULED,
        // Until the driver leaves.
        status: { in: [RideStatus.BOOKED, RideStatus.DRIVER_ASSIGNED] },
      },
      select: {
        id: true,
        originName: true,
        destinationName: true,
        estimatedPriceMinCents: true,
        estimatedPriceMaxCents: true,
        schedule: {
          select: {
            pickupAt: true,
            driver: {
              select: {
                driver: { select: { user: { select: { firstName: true } } } },
              },
            },
          },
        },
      },
      orderBy: { schedule: { pickupAt: 'asc' } },
    });

    // A booked ride always has its schedule.
    return rides.flatMap(({ schedule, ...ride }) =>
      schedule
        ? [
            {
              ...ride,
              pickupAt: schedule.pickupAt,
              driverFirstName: schedule.driver?.driver.user.firstName ?? null,
            },
          ]
        : [],
    );
  }
}
