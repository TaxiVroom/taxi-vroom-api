import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiProperty, ApiResponse } from '@nestjs/swagger';
import { routesV1 } from '@config/app.routes';
import { CurrentUser } from '@modules/auth/current-user.decorator';
import { RegisteredUser } from '@modules/auth/domain/authenticated-user';
import { Roles } from '@modules/auth/roles.decorator';
import { UserRoles } from '@modules/user/domain/user.types';

export class MeResponseDto {
  @ApiProperty({ enum: UserRoles, example: UserRoles.driver })
  role: UserRoles;
}

// Which home to open when the app starts with a saved session. The role is
// already read by the guard. A user not registered yet is refused.
@Controller(routesV1.version)
export class GetMeHttpController {
  @ApiOperation({ summary: "The signed-in user's role" })
  @ApiResponse({ status: HttpStatus.OK, type: MeResponseDto })
  @Roles(UserRoles.passenger, UserRoles.driver)
  @Get(routesV1.user.me)
  getMe(@CurrentUser() user: RegisteredUser): MeResponseDto {
    const me = new MeResponseDto();
    me.role = user.role;
    return me;
  }
}
