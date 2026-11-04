import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { addMinutes } from 'date-fns';
import { distanceBetween } from 'geofire-common';
import { PrismaService } from '@libs/db/prisma.service';
import { QueryBase } from '@libs/ddd/query.base';
import { RideEntity } from '@modules/ride/domain/ride.entity';
import { RideKind, RideStatus } from '@src/generated/prisma/client';

export class FindAvailableBookingsQuery extends QueryBase {
  readonly driverId: string;

  readonly latitude: number;

  readonly longitude: number;

  constructor(props: FindAvailableBookingsQuery) {
    super();
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
            canDepart: ride.status === RideStatus.DRIVER_ASSIGNED,
          },
        ]
      : [],
  );
}

const metersPerLatitudeDegree = 111_320;

// The bookings no driver committed to and this driver did not refuse, whose
// pickup is within reach of the driver and that do not start within the next
// 30 min. The soonest first.
@QueryHandler(FindAvailableBookingsQuery)
export class FindAvailableBookingsQueryHandler implements IQueryHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: FindAvailableBookingsQuery): Promise<DriverBooking[]> {
    const { latitude, longitude } = query;
    const radius = RideEntity.bookingsVisibleRadiusMeters;
    // A box around the driver for the database, then the exact distance.
    const latitudeDelta = radius / metersPerLatitudeDegree;
    const longitudeDelta = latitudeDelta / Math.cos((latitude * Math.PI) / 180);
    const rows: DriverBookingRow[] = await this.prisma.ride.findMany({
      where: {
        kind: RideKind.SCHEDULED,
        status: RideStatus.BOOKED,
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
          },
        },
      },
      select: driverBookingFields,
      orderBy: { schedule: { pickupAt: 'asc' } },
    });

    const withinReach = rows.filter(
      (row) =>
        distanceBetween(
          [latitude, longitude],
          [row.originLatitude, row.originLongitude],
        ) *
          1000 <=
        radius,
    );
    return toDriverBookings(withinReach);
  }
}
