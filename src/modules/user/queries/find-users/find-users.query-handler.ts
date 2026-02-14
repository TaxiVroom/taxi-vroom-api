import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Ok, Result } from 'oxide.ts';
import { PaginatedParams, PaginatedQueryBase } from '@libs/ddd/query.base';
import { Paginated } from '@src/libs/ddd';
import { UserModel } from '../../database/user.repository';
import { PrismaService } from '@libs/db/prisma.service';

export class FindUsersQuery extends PaginatedQueryBase {
  readonly country?: string;

  readonly postalCode?: string;

  readonly street?: string;

  constructor(props: PaginatedParams<FindUsersQuery>) {
    super(props);
    this.country = props.country;
    this.postalCode = props.postalCode;
    this.street = props.street;
  }
}

@QueryHandler(FindUsersQuery)
export class FindUsersQueryHandler implements IQueryHandler {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * In read model we don't need to execute
   * any business logic, so we can bypass
   * domain and repository layers completely
   * and execute query directly
   */
  async execute(
    query: FindUsersQuery,
  ): Promise<Result<Paginated<UserModel>, Error>> {
    const where: any = {};
    if (query.country) where.country = query.country;
    if (query.street) where.street = query.street;
    if (query.postalCode) where.postalCode = query.postalCode;

    const [data, count] = await Promise.all([
      this.prisma.user.findMany({
        where,
        take: query.limit,
        skip: query.offset,
      }),
      this.prisma.user.count({ where }),
    ]);

    return Ok(
      new Paginated({
        data,
        count,
        limit: query.limit,
        page: query.page,
      }),
    );
  }
}
