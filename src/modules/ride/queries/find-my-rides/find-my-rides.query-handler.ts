import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '@libs/db/prisma.service';
import { Paginated } from '@libs/ddd';
import { PaginatedParams, PaginatedQueryBase } from '@libs/ddd/query.base';
import {
  Prisma,
  RideOfferStatus,
  RideStatus,
} from '@src/generated/prisma/client';

export class FindMyRidesQuery extends PaginatedQueryBase {
  readonly passengerId: string;

  constructor(props: PaginatedParams<FindMyRidesQuery>) {
    super(props);
    this.passengerId = props.passengerId;
  }
}

export interface PastRide {
  id: string;
  originName: string;
  destinationName: string;
  startedAt: Date;
  totalCents: number;
}

const completedRide = {
  id: true,
  originName: true,
  destinationName: true,
  offers: {
    where: { status: RideOfferStatus.ACCEPTED },
    select: {
      acceptance: {
        select: {
          arrival: {
            select: {
              start: {
                select: {
                  startedAt: true,
                  completion: {
                    select: {
                      meterCents: true,
                      supplements: {
                        select: { unitPriceCents: true, quantity: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

type CompletedRide = Prisma.RideGetPayload<{ select: typeof completedRide }>;

// The passenger's finished rides, most recent first.
@QueryHandler(FindMyRidesQuery)
export class FindMyRidesQueryHandler implements IQueryHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: FindMyRidesQuery): Promise<Paginated<PastRide>> {
    const where = {
      passengerId: query.passengerId,
      status: RideStatus.COMPLETED,
    };
    const [rides, count] = await Promise.all([
      this.prisma.ride.findMany({
        where,
        select: completedRide,
        // The id breaks ties: two rides at the same time keep their page.
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: query.limit,
        skip: query.offset,
      }),
      this.prisma.ride.count({ where }),
    ]);

    return new Paginated({
      data: rides.flatMap((ride) => this.toPastRide(ride)),
      count,
      limit: query.limit,
      page: query.page,
    });
  }

  // A completed ride always has its accepted offer and its completion.
  private toPastRide(ride: CompletedRide): PastRide[] {
    const start = ride.offers[0]?.acceptance?.arrival?.start;
    const completion = start?.completion;
    if (!start || !completion) return [];

    return [
      {
        id: ride.id,
        originName: ride.originName,
        destinationName: ride.destinationName,
        startedAt: start.startedAt,
        totalCents: completion.supplements.reduce(
          (total, s) => total + s.unitPriceCents * s.quantity,
          completion.meterCents,
        ),
      },
    ];
  }
}
