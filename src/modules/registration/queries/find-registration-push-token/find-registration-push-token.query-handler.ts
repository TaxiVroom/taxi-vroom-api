import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { None, Option, Some } from 'oxide.ts';
import { QueryBase } from '@libs/ddd/query.base';
import { PrismaService } from '@libs/db/prisma.service';

// The phone's notification token given during the registration, as the
// notification module moves it to the account.
export class FindRegistrationPushTokenQuery extends QueryBase {
  readonly userId: string;

  constructor(props: FindRegistrationPushTokenQuery) {
    super();
    this.userId = props.userId;
  }
}

@QueryHandler(FindRegistrationPushTokenQuery)
export class FindRegistrationPushTokenQueryHandler implements IQueryHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    query: FindRegistrationPushTokenQuery,
  ): Promise<Option<string>> {
    const pushToken = await this.prisma.registrationPushToken.findUnique({
      where: { userId: query.userId },
    });
    return pushToken ? Some(pushToken.token) : None;
  }
}
