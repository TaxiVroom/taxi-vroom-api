import { Controller, Get, HttpStatus, NotFoundException } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Option } from 'oxide.ts';
import { routesV1 } from '@config/app.routes';
import { ApiErrorResponse } from '@libs/api/api-error.response';
import { CurrentUser } from '@modules/auth/current-user.decorator';
import { RegisteredUser } from '@modules/auth/domain/authenticated-user';
import { Roles } from '@modules/auth/roles.decorator';
import { UserRoles } from '@modules/user/domain/user.types';
import { DriverVehicleResponseDto } from '@modules/driver/dtos/driver-vehicle.response.dto';
import {
  DriverVehicleReadModel,
  FindMyVehicleQuery,
} from './find-my-vehicle.query-handler';

@Controller(routesV1.version)
export class FindMyVehicleHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @ApiOperation({ summary: "The driver's vehicle, for the account tab" })
  @ApiResponse({ status: HttpStatus.OK, type: DriverVehicleResponseDto })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Registered before the "Votre taxi" step existed',
    type: ApiErrorResponse,
  })
  @Roles(UserRoles.driver)
  @Get(routesV1.driver.vehicle)
  async findMyVehicle(
    @CurrentUser() user: RegisteredUser,
  ): Promise<DriverVehicleResponseDto> {
    const found: Option<DriverVehicleReadModel> = await this.queryBus.execute(
      new FindMyVehicleQuery({ driverId: user.id }),
    );
    if (found.isNone()) throw new NotFoundException('No vehicle yet');
    const vehicle = found.unwrap();
    const response = new DriverVehicleResponseDto();
    response.model = vehicle.model;
    response.color = vehicle.color;
    response.plate = vehicle.plate;
    response.adsNumber = vehicle.adsNumber;
    response.communeCode = vehicle.communeCode;
    response.communeName = vehicle.communeName;
    return response;
  }
}
