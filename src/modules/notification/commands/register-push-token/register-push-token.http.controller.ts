import { Body, Controller, HttpCode, HttpStatus, Put } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { routesV1 } from '@config/app.routes';
import { CurrentUser } from '@modules/auth/current-user.decorator';
import { RegisteredUser } from '@modules/auth/domain/authenticated-user';
import { Roles } from '@modules/auth/roles.decorator';
import { UserRoles } from '@modules/user/domain/user.types';
import { RegisterPushTokenCommand } from './register-push-token.command';
import { RegisterPushTokenRequestDto } from './register-push-token.request.dto';

@Controller(routesV1.version)
export class RegisterPushTokenHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @ApiOperation({ summary: "Saves the user's phone for push notifications" })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @Roles(UserRoles.passenger, UserRoles.driver)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Put(routesV1.notification.pushRegistration)
  async register(
    @CurrentUser() user: RegisteredUser,
    @Body() body: RegisterPushTokenRequestDto,
  ): Promise<void> {
    await this.commandBus.execute(
      new RegisterPushTokenCommand({ userId: user.id, token: body.token }),
    );
  }
}
