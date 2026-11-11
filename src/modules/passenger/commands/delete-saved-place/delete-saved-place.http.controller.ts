import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseEnumPipe,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { Result } from 'oxide.ts';
import { routesV1 } from '@config/app.routes';
import { ApiErrorResponse } from '@libs/api/api-error.response';
import { CurrentUser } from '@modules/auth/current-user.decorator';
import { RegisteredUser } from '@modules/auth/domain/authenticated-user';
import { Roles } from '@modules/auth/roles.decorator';
import { UserRoles } from '@modules/user/domain/user.types';
import { SavedPlaceKind } from '@modules/passenger/domain/passenger-saved-place.types';
import { SavedPlaceNotFoundError } from '@modules/passenger/domain/passenger.errors';
import { DeleteSavedPlaceCommand } from './delete-saved-place.command';

@Controller(routesV1.version)
export class DeleteSavedPlaceHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @ApiOperation({ summary: 'Removes "Maison" or "Travail"' })
  @ApiParam({ name: 'kind', enum: SavedPlaceKind })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'SAVED_PLACE.NOT_FOUND',
    type: ApiErrorResponse,
  })
  @Roles(UserRoles.passenger)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(routesV1.passenger.savedPlace)
  async delete(
    @CurrentUser() user: RegisteredUser,
    @Param('kind', new ParseEnumPipe(SavedPlaceKind)) kind: SavedPlaceKind,
  ): Promise<void> {
    const result: Result<void, SavedPlaceNotFoundError> =
      await this.commandBus.execute(
        new DeleteSavedPlaceCommand({ passengerId: user.id, kind }),
      );
    if (result.isErr()) {
      const error = result.unwrapErr();
      throw new NotFoundException({ message: error.message, code: error.code });
    }
  }
}
