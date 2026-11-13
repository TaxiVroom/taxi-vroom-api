import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import { QueryBase } from '@libs/ddd/query.base';
import { PrismaService } from '@libs/db/prisma.service';
import { RideNotFoundError } from '@modules/ride/domain/ride.errors';
import { RideOfferStatus } from '@src/generated/prisma/client';

// What the driver needs to fill the end of the ride: the passengers, and the
// price of the supplement for each one from the fifth.
export interface RideCheckoutReadModel {
  passengerCount: number;
  extraPassengerCents: number;
}

export class GetRideCheckoutQuery extends QueryBase {
  readonly rideId: string;
  readonly driverId: string;

  constructor(props: GetRideCheckoutQuery) {
    super();
    this.rideId = props.rideId;
    this.driverId = props.driverId;
  }
}

// Only for the driver who took the ride; the price comes from the tariff the
// ride was estimated with. Spec docs/specs/nombre-de-passagers.md.
@QueryHandler(GetRideCheckoutQuery)
export class GetRideCheckoutQueryHandler implements IQueryHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    query: GetRideCheckoutQuery,
  ): Promise<Result<RideCheckoutReadModel, RideNotFoundError>> {
    const ride = await this.prisma.ride.findFirst({
      where: {
        id: query.rideId,
        offers: {
          some: {
            driverId: query.driverId,
            status: RideOfferStatus.ACCEPTED,
          },
        },
      },
      select: {
        passengerCount: true,
        tariff: { select: { extraPassengerCents: true } },
      },
    });
    if (!ride) return Err(new RideNotFoundError());
    return Ok({
      passengerCount: ride.passengerCount,
      extraPassengerCents: ride.tariff.extraPassengerCents,
    });
  }
}
