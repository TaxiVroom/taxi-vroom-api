import {
  Body,
  ConflictException,
  Controller,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { match, Result } from 'oxide.ts';
import { routesV1 } from '@config/app.routes';
import { ApiErrorResponse } from '@libs/api/api-error.response';
import { CurrentUser } from '@modules/auth/current-user.decorator';
import { RegisteredUser } from '@modules/auth/domain/authenticated-user';
import { Roles } from '@modules/auth/roles.decorator';
import { UserRoles } from '@modules/user/domain/user.types';
import { PassengerSavedPlaceEntity } from '@modules/passenger/domain/passenger-saved-place.entity';
import { SavedPlaceAlreadyExistsError } from '@modules/passenger/domain/passenger.errors';
import { SavedPlaceResponseDto } from '@modules/passenger/dtos/saved-place.response.dto';
import { PassengerSavedPlaceMapper } from '@modules/passenger/passenger-saved-place.mapper';
import { AddSavedPlaceCommand } from './add-saved-place.command';
import { AddSavedPlaceRequestDto } from './add-saved-place.request.dto';

@Controller(routesV1.version)
export class AddSavedPlaceHttpController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly mapper: PassengerSavedPlaceMapper,
  ) {}

  @ApiOperation({ summary: 'Saves "Maison" or "Travail"' })
  @ApiResponse({ status: HttpStatus.CREATED, type: SavedPlaceResponseDto })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'SAVED_PLACE.ALREADY_EXISTS',
    type: ApiErrorResponse,
  })
  @Roles(UserRoles.passenger)
  @Post(routesV1.passenger.savedPlaces)
  async add(
    @CurrentUser() user: RegisteredUser,
    @Body() body: AddSavedPlaceRequestDto,
  ): Promise<SavedPlaceResponseDto> {
    const result: Result<
      PassengerSavedPlaceEntity,
      SavedPlaceAlreadyExistsError
    > = await this.commandBus.execute(
      new AddSavedPlaceCommand({ passengerId: user.id, ...body }),
    );

    return match(result, {
      Ok: (place: PassengerSavedPlaceEntity) => this.mapper.toResponse(place),
      Err: (error: SavedPlaceAlreadyExistsError) => {
        throw new ConflictException({
          message: error.message,
          code: error.code,
        });
      },
    });
  }
}
