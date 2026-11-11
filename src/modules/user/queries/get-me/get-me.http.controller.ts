import { Controller, Get, HttpStatus } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiProperty, ApiResponse } from '@nestjs/swagger';
import { routesV1 } from '@config/app.routes';
import { CurrentUser } from '@modules/auth/current-user.decorator';
import { RegisteredUser } from '@modules/auth/domain/authenticated-user';
import { Roles } from '@modules/auth/roles.decorator';
import { UserRoles } from '@modules/user/domain/user.types';
import {
  GetMyProfileQuery,
  UserProfileReadModel,
} from './get-my-profile.query-handler';

export class MeResponseDto {
  @ApiProperty({ enum: UserRoles, example: UserRoles.driver })
  role: UserRoles;

  @ApiProperty({ example: 'Jean' })
  firstName: string;

  @ApiProperty({ example: 'Dupont' })
  lastName: string;

  @ApiProperty({ example: '+33612345678', description: 'E.164 format' })
  phone: string;

  @ApiProperty({ example: 'jean.dupont@exemple.fr' })
  email: string;
}

// Which home to open when the app starts with a saved session, and the
// passenger's "Compte" tab. The role is already read by the guard. A user not
// registered yet is refused. Spec docs/specs/compte-a-jour.md.
@Controller(routesV1.version)
export class GetMeHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @ApiOperation({ summary: "The signed-in user's role and profile" })
  @ApiResponse({ status: HttpStatus.OK, type: MeResponseDto })
  @Roles(UserRoles.passenger, UserRoles.driver)
  @Get(routesV1.user.me)
  async getMe(@CurrentUser() user: RegisteredUser): Promise<MeResponseDto> {
    const profile: UserProfileReadModel = await this.queryBus.execute(
      new GetMyProfileQuery({ userId: user.id }),
    );
    const me = new MeResponseDto();
    me.role = user.role;
    me.firstName = profile.firstName;
    me.lastName = profile.lastName;
    me.phone = profile.phone;
    me.email = profile.email;
    return me;
  }
}
