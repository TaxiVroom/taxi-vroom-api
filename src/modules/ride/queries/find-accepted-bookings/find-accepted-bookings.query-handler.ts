import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '@libs/db/prisma.service';
import { Paginated } from '@libs/ddd';
import { PaginatedParams, PaginatedQueryBase } from '@libs/ddd/query.base';
import { RideKind, RideStatus } from '@src/generated/prisma/client';
import {
  DriverBooking,
  DriverBookingRow,
  driverBookingFields,
  soonestFirst,
  toDriverBookings,
} from '../find-available-bookings/find-available-bookings.query-handler';

export class FindAcceptedBookingsQuery extends PaginatedQueryBase {
  readonly driverId: string;

  constructor(props: PaginatedParams<FindAcceptedBookingsQuery>) {
    super(props);
    this.driverId = props.driverId;
  }
}

// The bookings the driver committed to, not left for yet, the soonest first,
// page by page.
@QueryHandler(FindAcceptedBookingsQuery)
export class FindAcceptedBookingsQueryHandler implements IQueryHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    query: FindAcceptedBookingsQuery,
  ): Promise<Paginated<DriverBooking>> {
    const where = {
      kind: RideKind.SCHEDULED,
      // Assigned once its deadline passed, until "Je pars".
      status: { in: [RideStatus.BOOKED, RideStatus.DRIVER_ASSIGNED] },
      schedule: { driver: { driverId: query.driverId } },
    };
    const [rows, count]: [DriverBookingRow[], number] = await Promise.all([
      this.prisma.ride.findMany({
        where,
        select: driverBookingFields,
        orderBy: soonestFirst,
        take: query.limit,
        skip: query.offset,
      }),
      this.prisma.ride.count({ where }),
    ]);
    return new Paginated({
      data: toDriverBookings(rows),
      count,
      limit: query.limit,
      page: query.page,
    });
  }
}
