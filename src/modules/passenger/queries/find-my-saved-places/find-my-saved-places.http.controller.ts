import { Controller, Get, HttpStatus } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { routesV1 } from '@config/app.routes';
import { CurrentUser } from '@modules/auth/current-user.decorator';
import { RegisteredUser } from '@modules/auth/domain/authenticated-user';
import { Roles } from '@modules/auth/roles.decorator';
import { UserRoles } from '@modules/user/domain/user.types';
import { SavedPlaceResponseDto } from '@modules/passenger/dtos/saved-place.response.dto';
import {
  FindMySavedPlacesQuery,
  SavedPlaceReadModel,
} from './find-my-saved-places.query-handler';

@Controller(routesV1.version)
export class FindMySavedPlacesHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @ApiOperation({ summary: '"Maison" and "Travail" of the passenger, if set' })
  @ApiResponse({ status: HttpStatus.OK, type: [SavedPlaceResponseDto] })
  @Roles(UserRoles.passenger)
  @Get(routesV1.passenger.savedPlaces)
  async findMySavedPlaces(
    @CurrentUser() user: RegisteredUser,
  ): Promise<SavedPlaceResponseDto[]> {
    const places: SavedPlaceReadModel[] = await this.queryBus.execute(
      new FindMySavedPlacesQuery(user.id),
    );
    return places.map((place) => SavedPlaceResponseDto.fromReadModel(place));
  }
}
