import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '@libs/db/prisma.service';
import { Paginated } from '@libs/ddd';
import { PaginatedParams, PaginatedQueryBase } from '@libs/ddd/query.base';
import { RideKind, RideStatus } from '@src/generated/prisma/client';

export class FindMyBookingsQuery extends PaginatedQueryBase {
  readonly passengerId: string;

  constructor(props: PaginatedParams<FindMyBookingsQuery>) {
    super(props);
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

  async execute(
    query: FindMyBookingsQuery,
  ): Promise<Paginated<PassengerBooking>> {
    const where = {
      passengerId: query.passengerId,
      kind: RideKind.SCHEDULED,
      // Until the driver leaves.
      status: { in: [RideStatus.BOOKED, RideStatus.DRIVER_ASSIGNED] },
    };
    const [rides, count] = await Promise.all([
      this.prisma.ride.findMany({
        where,
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
                  driver: {
                    select: { user: { select: { firstName: true } } },
                  },
                },
              },
            },
          },
        },
        // The id breaks ties: two bookings at the same time keep their page.
        orderBy: [{ schedule: { pickupAt: 'asc' } }, { id: 'asc' }],
        take: query.limit,
        skip: query.offset,
      }),
      this.prisma.ride.count({ where }),
    ]);

    // A booked ride always has its schedule.
    return new Paginated({
      data: rides.flatMap(({ schedule, ...ride }) =>
        schedule
          ? [
              {
                ...ride,
                pickupAt: schedule.pickupAt,
                driverFirstName: schedule.driver?.driver.user.firstName ?? null,
              },
            ]
          : [],
      ),
      count,
      limit: query.limit,
      page: query.page,
    });
  }
}
