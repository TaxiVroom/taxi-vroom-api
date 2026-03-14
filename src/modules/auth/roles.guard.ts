import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '@libs/db/prisma.service';
import { UserRoles } from '@modules/user/domain/user.types';
import { ROLES_KEY } from './roles.decorator';
import { GuestUser, RegisteredUser } from './domain/authenticated-user';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles =
      this.reflector.getAllAndOverride<UserRoles[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const { id, email } = request.user as GuestUser;

    // TODO: for better performance, replace this DB query with Firebase Custom Claims
    // once the app reaches scale. Custom Claims are set at registration completion and
    // read directly from the decoded token — no DB round-trip needed.
    // Note: if a user's role can change (passenger → driver), Custom Claims require
    // forcing a token refresh on the client side after the change.
    const dbUser = await this.prisma.user.findUnique({ where: { id } });

    if (!dbUser || !requiredRoles.includes(dbUser.role as UserRoles)) {
      throw new ForbiddenException();
    }

    request.user = new RegisteredUser(id, email, dbUser.role as UserRoles);
    return true;
  }
}
