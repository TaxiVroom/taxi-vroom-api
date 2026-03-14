import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Ok, Result } from 'oxide.ts';
import { QueryBase } from '@libs/ddd/query.base';
import { PrismaService } from '@libs/db/prisma.service';

export class CheckEmailAvailabilityQuery extends QueryBase {
  readonly requestingUserId: string;
  readonly email: string;

  constructor(props: CheckEmailAvailabilityQuery) {
    super();
    this.requestingUserId = props.requestingUserId;
    this.email = props.email;
  }
}

@QueryHandler(CheckEmailAvailabilityQuery)
export class CheckEmailAvailabilityQueryHandler implements IQueryHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    query: CheckEmailAvailabilityQuery,
  ): Promise<Result<boolean, never>> {
    const [existingUser, existingRegistration] = await Promise.all([
      this.prisma.user.findUnique({
        where: { email: query.email },
        select: { id: true },
      }),
      this.prisma.registration.findFirst({
        where: { email: query.email },
        select: { userId: true },
      }),
    ]);

    // An email already used by the requesting user is considered available (re-registration case).
    const takenByAnotherUser =
      existingUser !== null && existingUser.id !== query.requestingUserId;
    const takenByAnotherRegistration =
      existingRegistration !== null &&
      existingRegistration.userId !== query.requestingUserId;

    return Ok(!takenByAnotherUser && !takenByAnotherRegistration);
  }
}
