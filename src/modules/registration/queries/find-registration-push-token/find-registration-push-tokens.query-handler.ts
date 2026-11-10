import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { QueryBase } from '@libs/ddd/query.base';
import { PrismaService } from '@libs/db/prisma.service';

// The phones kept with the registrations, in one read: userId → token.
export class FindRegistrationPushTokensQuery extends QueryBase {
  readonly userIds: string[];

  constructor(props: FindRegistrationPushTokensQuery) {
    super();
    this.userIds = props.userIds;
  }
}

@QueryHandler(FindRegistrationPushTokensQuery)
export class FindRegistrationPushTokensQueryHandler implements IQueryHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    query: FindRegistrationPushTokensQuery,
  ): Promise<Map<string, string>> {
    const rows = await this.prisma.registrationPushToken.findMany({
      where: { userId: { in: query.userIds } },
      select: { userId: true, token: true },
    });
    return new Map(rows.map((row) => [row.userId, row.token]));
  }
}
