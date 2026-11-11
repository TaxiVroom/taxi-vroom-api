import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { QueryBase } from '@libs/ddd/query.base';
import { PrismaService } from '@libs/db/prisma.service';

// What the "Compte" tab shows of the user, passenger or driver.
export interface UserProfileReadModel {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
}

export class GetMyProfileQuery extends QueryBase {
  readonly userId: string;

  constructor(props: GetMyProfileQuery) {
    super();
    this.userId = props.userId;
  }
}

// The signed-in user's profile. The user row exists: the routes sending this
// query are behind @Roles, whose guard reads it. Spec
// docs/specs/compte-a-jour.md.
@QueryHandler(GetMyProfileQuery)
export class GetMyProfileQueryHandler implements IQueryHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetMyProfileQuery): Promise<UserProfileReadModel> {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: query.userId },
      select: { firstName: true, lastName: true, phone: true, email: true },
    });
  }
}
