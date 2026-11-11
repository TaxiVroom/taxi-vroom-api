import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '@libs/db/prisma.service';
import { QueryBase } from '@libs/ddd/query.base';

export class GetMyRatingQuery extends QueryBase {
  readonly driverId: string;

  constructor(props: GetMyRatingQuery) {
    super();
    this.driverId = props.driverId;
  }
}

// The average of all the driver's ratings, the one passengers see; null
// without any. Spec docs/specs/gains-reels.md.
@QueryHandler(GetMyRatingQuery)
export class GetMyRatingQueryHandler implements IQueryHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetMyRatingQuery): Promise<number | null> {
    const ratings = await this.prisma.rideRating.aggregate({
      where: {
        completion: {
          start: {
            arrival: { acceptance: { offer: { driverId: query.driverId } } },
          },
        },
      },
      _avg: { stars: true },
    });
    return ratings._avg.stars;
  }
}
