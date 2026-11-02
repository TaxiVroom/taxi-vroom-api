import { Controller, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { routesV1 } from '@config/app.routes';
import { CurrentUser } from '@modules/auth/current-user.decorator';
import { RegisteredUser } from '@modules/auth/domain/authenticated-user';
import { Roles } from '@modules/auth/roles.decorator';
import { UserRoles } from '@modules/user/domain/user.types';
import { UnregisterPushTokenCommand } from './unregister-push-token.command';

@Controller(routesV1.version)
export class UnregisterPushTokenHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @ApiOperation({ summary: 'Stops the push notifications of the user' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @Roles(UserRoles.passenger, UserRoles.driver)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(routesV1.notification.pushRegistration)
  async unregister(@CurrentUser() user: RegisteredUser): Promise<void> {
    await this.commandBus.execute(
      new UnregisterPushTokenCommand({ userId: user.id }),
    );
  }
}
