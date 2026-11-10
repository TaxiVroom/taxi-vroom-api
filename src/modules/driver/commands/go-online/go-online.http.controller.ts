import {
  ConflictException,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Result } from 'oxide.ts';
import { routesV1 } from '@config/app.routes';
import { ApiErrorResponse } from '@libs/api/api-error.response';
import { CurrentUser } from '@modules/auth/current-user.decorator';
import { RegisteredUser } from '@modules/auth/domain/authenticated-user';
import { Roles } from '@modules/auth/roles.decorator';
import { UserRoles } from '@modules/user/domain/user.types';
import { DriverDocumentsBlockingError } from '@modules/driver/domain/driver.errors';
import { GoOnlineCommand } from './go-online.command';

@Controller(routesV1.version)
export class GoOnlineHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @ApiOperation({ summary: '"Passer en ligne": checks the documents first' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'DRIVER.DOCUMENTS_BLOCKING',
    type: ApiErrorResponse,
  })
  @Roles(UserRoles.driver)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post(routesV1.driver.online)
  async goOnline(@CurrentUser() user: RegisteredUser): Promise<void> {
    const result: Result<null, DriverDocumentsBlockingError> =
      await this.commandBus.execute(new GoOnlineCommand({ driverId: user.id }));
    if (result.isErr()) {
      const error = result.unwrapErr();
      throw new ConflictException({ message: error.message, code: error.code });
    }
  }
}
