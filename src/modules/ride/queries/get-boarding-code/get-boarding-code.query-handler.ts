import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import { QueryBase } from '@libs/ddd/query.base';
import { PrismaService } from '@libs/db/prisma.service';
import { RideNotFoundError } from '@modules/ride/domain/ride.errors';

export class GetBoardingCodeQuery extends QueryBase {
  readonly rideId: string;
  readonly passengerId: string;

  constructor(props: GetBoardingCodeQuery) {
    super();
    this.rideId = props.rideId;
    this.passengerId = props.passengerId;
  }
}

// The code of the passenger's own ride, while a driver comes or waits: the
// driver never gets it, they must hear it from the passenger.
@QueryHandler(GetBoardingCodeQuery)
export class GetBoardingCodeQueryHandler implements IQueryHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    query: GetBoardingCodeQuery,
  ): Promise<Result<string, RideNotFoundError>> {
    const boardingCode = await this.prisma.rideBoardingCode.findFirst({
      where: {
        acceptance: {
          offer: {
            rideId: query.rideId,
            ride: { passengerId: query.passengerId },
          },
        },
      },
      select: { code: true },
    });
    return boardingCode ? Ok(boardingCode.code) : Err(new RideNotFoundError());
  }
}
