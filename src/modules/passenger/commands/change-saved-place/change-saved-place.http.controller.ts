import {
  Body,
  Controller,
  HttpStatus,
  NotFoundException,
  Param,
  ParseEnumPipe,
  Patch,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { match, Result } from 'oxide.ts';
import { routesV1 } from '@config/app.routes';
import { ApiErrorResponse } from '@libs/api/api-error.response';
import { CurrentUser } from '@modules/auth/current-user.decorator';
import { RegisteredUser } from '@modules/auth/domain/authenticated-user';
import { Roles } from '@modules/auth/roles.decorator';
import { UserRoles } from '@modules/user/domain/user.types';
import { PassengerSavedPlaceEntity } from '@modules/passenger/domain/passenger-saved-place.entity';
import { SavedPlaceKind } from '@modules/passenger/domain/passenger-saved-place.types';
import { SavedPlaceNotFoundError } from '@modules/passenger/domain/passenger.errors';
import { SavedPlaceLocationRequestDto } from '@modules/passenger/dtos/saved-place-location.request.dto';
import { SavedPlaceResponseDto } from '@modules/passenger/dtos/saved-place.response.dto';
import { PassengerSavedPlaceMapper } from '@modules/passenger/passenger-saved-place.mapper';
import { ChangeSavedPlaceCommand } from './change-saved-place.command';

@Controller(routesV1.version)
export class ChangeSavedPlaceHttpController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly mapper: PassengerSavedPlaceMapper,
  ) {}

  @ApiOperation({ summary: 'Moves "Maison" or "Travail" to another address' })
  @ApiParam({ name: 'kind', enum: SavedPlaceKind })
  @ApiResponse({ status: HttpStatus.OK, type: SavedPlaceResponseDto })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'SAVED_PLACE.NOT_FOUND',
    type: ApiErrorResponse,
  })
  @Roles(UserRoles.passenger)
  @Patch(routesV1.passenger.savedPlace)
  async change(
    @CurrentUser() user: RegisteredUser,
    @Param('kind', new ParseEnumPipe(SavedPlaceKind)) kind: SavedPlaceKind,
    @Body() body: SavedPlaceLocationRequestDto,
  ): Promise<SavedPlaceResponseDto> {
    const result: Result<PassengerSavedPlaceEntity, SavedPlaceNotFoundError> =
      await this.commandBus.execute(
        new ChangeSavedPlaceCommand({ passengerId: user.id, kind, ...body }),
      );

    return match(result, {
      Ok: (place: PassengerSavedPlaceEntity) => this.mapper.toResponse(place),
      Err: (error: SavedPlaceNotFoundError) => {
        throw new NotFoundException({
          message: error.message,
          code: error.code,
        });
      },
    });
  }
}
