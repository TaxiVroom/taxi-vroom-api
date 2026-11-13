import { Controller, Get, HttpStatus } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Option } from 'oxide.ts';
import { routesV1 } from '@config/app.routes';
import { CurrentUser } from '@modules/auth/current-user.decorator';
import { RegisteredUser } from '@modules/auth/domain/authenticated-user';
import { Roles } from '@modules/auth/roles.decorator';
import { UserRoles } from '@modules/user/domain/user.types';
import {
  GetMyProfileQuery,
  UserProfileReadModel,
} from '@modules/user/queries/get-me/get-my-profile.query-handler';
import { DriverAccountResponseDto } from '@modules/driver/dtos/driver-account.response.dto';
import { DriverDocumentsResponseDto } from '@modules/driver/dtos/driver-document.response.dto';
import { DriverVehicleResponseDto } from '@modules/driver/dtos/driver-vehicle.response.dto';
import {
  DriverVehicleReadModel,
  FindMyVehicleQuery,
} from '@modules/driver/queries/find-my-vehicle/find-my-vehicle.query-handler';
import {
  DriverDocumentStatesReadModel,
  GetDriverDocumentStatesQuery,
} from '@modules/driver/queries/get-driver-document-states/get-driver-document-states.query-handler';

// The driver's "Compte" tab: profile, vehicle and documents in one call, read
// again each time the tab opens. Spec docs/specs/compte-a-jour.md.
@Controller(routesV1.version)
export class GetMyAccountHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @ApiOperation({ summary: "The driver's profile, vehicle and documents" })
  @ApiResponse({ status: HttpStatus.OK, type: DriverAccountResponseDto })
  @Roles(UserRoles.driver)
  @Get(routesV1.driver.account)
  async getMyAccount(
    @CurrentUser() user: RegisteredUser,
  ): Promise<DriverAccountResponseDto> {
    const [profile, vehicle, [documents]]: [
      UserProfileReadModel,
      Option<DriverVehicleReadModel>,
      DriverDocumentStatesReadModel[],
    ] = await Promise.all([
      this.queryBus.execute(new GetMyProfileQuery({ userId: user.id })),
      this.queryBus.execute(new FindMyVehicleQuery({ driverId: user.id })),
      this.queryBus.execute(
        new GetDriverDocumentStatesQuery({ driverIds: [user.id] }),
      ),
    ]);
    const response = new DriverAccountResponseDto();
    response.firstName = profile.firstName;
    response.lastName = profile.lastName;
    response.phone = profile.phone;
    response.email = profile.email;
    response.vehicle = vehicle.isSome()
      ? this.vehicleResponse(vehicle.unwrap())
      : null;
    response.documents = DriverDocumentsResponseDto.fromReadModel(documents);
    return response;
  }

  private vehicleResponse(
    vehicle: DriverVehicleReadModel,
  ): DriverVehicleResponseDto {
    const response = new DriverVehicleResponseDto();
    response.model = vehicle.model;
    response.color = vehicle.color;
    response.plate = vehicle.plate;
    response.adsNumber = vehicle.adsNumber;
    response.communeCode = vehicle.communeCode;
    response.communeName = vehicle.communeName;
    response.passengerSeats = vehicle.passengerSeats;
    return response;
  }
}
