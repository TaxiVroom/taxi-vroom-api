import { IQueryHandler, QueryBus, QueryHandler } from '@nestjs/cqrs';
import { addMinutes } from 'date-fns';
import { distanceBetween } from 'geofire-common';
import { PrismaService } from '@libs/db/prisma.service';
import { Paginated } from '@libs/ddd';
import { PaginatedParams, PaginatedQueryBase } from '@libs/ddd/query.base';
import { RideEntity } from '@modules/ride/domain/ride.entity';
import { RideKind, RideStatus } from '@src/generated/prisma/client';
import {
  DriverDocumentStatesReadModel,
  GetDriverDocumentStatesQuery,
} from '@modules/driver/queries/get-driver-document-states/get-driver-document-states.query-handler';
import {
  DriverSeatsReadModel,
  GetDriverSeatsQuery,
} from '@modules/driver/queries/get-driver-seats/get-driver-seats.query-handler';

export class FindAvailableBookingsQuery extends PaginatedQueryBase {
  readonly driverId: string;

  readonly latitude: number;

  readonly longitude: number;

  constructor(props: PaginatedParams<FindAvailableBookingsQuery>) {
    super(props);
    this.driverId = props.driverId;
    this.latitude = props.latitude;
    this.longitude = props.longitude;
  }
}

export interface DriverBooking {
  id: string;
  pickupAt: Date;
  originName: string;
  destinationName: string;
  tripMeters: number;
  estimatedPriceMinCents: number;
  estimatedPriceMaxCents: number;
  passengerFirstName: string;
  passengerCount: number;
  // Its deadline passed and it is theirs: "Je pars" replaces "Se désister".
  canDepart: boolean;
}

// What a driver is shown of a booking, also for their accepted ones.
export const driverBookingFields = {
  id: true,
  status: true,
  originName: true,
  originLatitude: true,
  originLongitude: true,
  destinationName: true,
  estimatedPriceMinCents: true,
  estimatedPriceMaxCents: true,
  passengerCount: true,
  passenger: { select: { user: { select: { firstName: true } } } },
  schedule: { select: { pickupAt: true, tripMeters: true } },
};

export interface DriverBookingRow {
  id: string;
  status: RideStatus;
  originName: string;
  originLatitude: number;
  originLongitude: number;
  destinationName: string;
  estimatedPriceMinCents: number;
  estimatedPriceMaxCents: number;
  passengerCount: number;
  passenger: { user: { firstName: string } };
  schedule: { pickupAt: Date; tripMeters: number } | null;
}

// A booked ride always has its schedule.
export function toDriverBookings(rows: DriverBookingRow[]): DriverBooking[] {
  return rows.flatMap(({ schedule, passenger, ...ride }) =>
    schedule
      ? [
          {
            id: ride.id,
            pickupAt: schedule.pickupAt,
            originName: ride.originName,
            destinationName: ride.destinationName,
            tripMeters: schedule.tripMeters,
            estimatedPriceMinCents: ride.estimatedPriceMinCents,
            estimatedPriceMaxCents: ride.estimatedPriceMaxCents,
            passengerFirstName: passenger.user.firstName,
            passengerCount: ride.passengerCount,
            canDepart: ride.status === RideStatus.DRIVER_ASSIGNED,
          },
        ]
      : [],
  );
}

const metersPerLatitudeDegree = 111_320;

// The order of both lists of a driver: the soonest first, the id breaks ties
// so two bookings at the same time keep their page.
export const soonestFirst = [
  { schedule: { pickupAt: 'asc' as const } },
  { id: 'asc' as const },
];

// The bookings no driver committed to and this driver did not refuse, whose
// pickup is within reach of the driver and that do not start within the next
// 30 min, nor after the end of one of their documents (the app tells why,
// from GET drivers/me/documents), and that have no more passengers than the
// seats of their taxi: this query filters them itself, it never calls the
// domain. The soonest first, page by page.
//
// The database only filters a box around the driver: the exact distance is
// computed here. So a page is cut in three steps: the ids and positions of
// the box, the exact distance on them (its length is the count), then the
// full rows of the page only.
@QueryHandler(FindAvailableBookingsQuery)
export class FindAvailableBookingsQueryHandler implements IQueryHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queryBus: QueryBus,
  ) {}

  async execute(
    query: FindAvailableBookingsQuery,
  ): Promise<Paginated<DriverBooking>> {
    const withinReach = await this.findIdsWithinReach(query);
    const pageIds = withinReach
      .slice(query.offset, query.offset + query.limit)
      .map((booking) => booking.id);
    const rows: DriverBookingRow[] = await this.prisma.ride.findMany({
      where: { id: { in: pageIds } },
      select: driverBookingFields,
      orderBy: soonestFirst,
    });
    return new Paginated({
      data: toDriverBookings(rows),
      count: withinReach.length,
      limit: query.limit,
      page: query.page,
    });
  }

  // Every booking this driver may see, the soonest first.
  private async findIdsWithinReach(
    query: FindAvailableBookingsQuery,
  ): Promise<{ id: string }[]> {
    const { latitude, longitude } = query;
    const radius = RideEntity.bookingsVisibleRadiusMeters;
    // A box around the driver for the database, then the exact distance.
    const latitudeDelta = radius / metersPerLatitudeDegree;
    const longitudeDelta = latitudeDelta / Math.cos((latitude * Math.PI) / 180);
    // No vehicle: no known seats, so no booking fits.
    const [[seats], [documents]]: [
      DriverSeatsReadModel[],
      DriverDocumentStatesReadModel[],
    ] = await Promise.all([
      this.queryBus.execute(
        new GetDriverSeatsQuery({ driverIds: [query.driverId] }),
      ),
      this.queryBus.execute(
        new GetDriverDocumentStatesQuery({ driverIds: [query.driverId] }),
      ),
    ]);
    const inTheBox = await this.prisma.ride.findMany({
      where: {
        kind: RideKind.SCHEDULED,
        status: RideStatus.BOOKED,
        passengerCount: { lte: seats?.passengerSeats ?? 0 },
        originLatitude: {
          gte: latitude - latitudeDelta,
          lte: latitude + latitudeDelta,
        },
        originLongitude: {
          gte: longitude - longitudeDelta,
          lte: longitude + longitudeDelta,
        },
        schedule: {
          driver: null,
          // Those this driver refused never come back.
          refusals: { none: { driverId: query.driverId } },
          pickupAt: {
            gt: addMinutes(new Date(), RideEntity.bookingDepartureLeadMinutes),
            // Not after the end of one of their documents.
            lt: documents.inOrderUntil ?? undefined,
          },
        },
      },
      select: { id: true, originLatitude: true, originLongitude: true },
      orderBy: soonestFirst,
    });
    return inTheBox.filter(
      (row) =>
        distanceBetween(
          [latitude, longitude],
          [row.originLatitude, row.originLongitude],
        ) *
          1000 <=
        radius,
    );
  }
}
