import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '@libs/db/prisma.service';
import { QueryBase } from '@libs/ddd/query.base';
import { RideKind, RideStatus } from '@src/generated/prisma/client';
import {
  DriverBooking,
  DriverBookingRow,
  driverBookingFields,
  toDriverBookings,
} from '../find-available-bookings/find-available-bookings.query-handler';

export class FindAcceptedBookingsQuery extends QueryBase {
  readonly driverId: string;

  constructor(props: FindAcceptedBookingsQuery) {
    super();
    this.driverId = props.driverId;
  }
}

// The bookings the driver committed to, not left for yet, the soonest first.
@QueryHandler(FindAcceptedBookingsQuery)
export class FindAcceptedBookingsQueryHandler implements IQueryHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: FindAcceptedBookingsQuery): Promise<DriverBooking[]> {
    const rows: DriverBookingRow[] = await this.prisma.ride.findMany({
      where: {
        kind: RideKind.SCHEDULED,
        // Assigned once its deadline passed, until "Je pars".
        status: { in: [RideStatus.BOOKED, RideStatus.DRIVER_ASSIGNED] },
        schedule: { driver: { driverId: query.driverId } },
      },
      select: driverBookingFields,
      orderBy: { schedule: { pickupAt: 'asc' } },
    });
    return toDriverBookings(rows);
  }
}
