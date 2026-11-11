import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '@libs/db/prisma.service';
import { QueryBase } from '@libs/ddd/query.base';
import { RideOfferStatus } from '@src/generated/prisma/client';

export class GetMyAcceptanceRateQuery extends QueryBase {
  readonly driverId: string;

  constructor(props: GetMyAcceptanceRateQuery) {
    super();
    this.driverId = props.driverId;
  }
}

// The share of the driver's last 100 ride requests they accepted, in
// percent; null under 10 requests. Spec docs/specs/gains-reels.md, "Taux
// d'acceptation".
@QueryHandler(GetMyAcceptanceRateQuery)
export class GetMyAcceptanceRateQueryHandler implements IQueryHandler {
  private static readonly lastRequests = 100;

  private static readonly minRequests = 10;

  constructor(private readonly prisma: PrismaService) {}

  // Raw SQL: leaving out a request stopped by the passenger's cancellation
  // compares two columns (the offer's expiredAt and the ride's cancelledAt,
  // the same instant), which Prisma cannot write before the limit.
  // A "Je pars" offer is accepted the instant it is created: not a request.
  async execute(query: GetMyAcceptanceRateQuery): Promise<number | null> {
    const requests: { status: RideOfferStatus }[] = await this.prisma.$queryRaw`
      SELECT o.status
      FROM ride_offers o
      LEFT JOIN ride_offer_acceptances a ON a."offerId" = o.id
      LEFT JOIN ride_offer_expirations e ON e."offerId" = o.id
      LEFT JOIN ride_cancellations c ON c."rideId" = o."rideId"
      WHERE o."driverId" = ${query.driverId}
        AND o.status <> 'PENDING'
        AND (a."acceptedAt" IS NULL OR a."acceptedAt" <> o."offeredAt")
        AND (e."expiredAt" IS NULL OR c."cancelledAt" IS NULL
             OR e."expiredAt" <> c."cancelledAt")
      ORDER BY o."offeredAt" DESC
      LIMIT ${GetMyAcceptanceRateQueryHandler.lastRequests}`;
    if (requests.length < GetMyAcceptanceRateQueryHandler.minRequests) {
      return null;
    }
    // Accepted then given up still counts as accepted.
    const accepted = requests.filter(
      (r) =>
        r.status === RideOfferStatus.ACCEPTED ||
        r.status === RideOfferStatus.WITHDRAWN,
    ).length;
    return Math.round((accepted * 100) / requests.length);
  }
}
