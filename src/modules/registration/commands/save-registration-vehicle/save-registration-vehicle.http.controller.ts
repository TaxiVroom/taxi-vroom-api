import {
  Body,
  ConflictException,
  Controller,
  HttpStatus,
  NotFoundException,
  Put,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CommandBus } from '@nestjs/cqrs';
import { match, Result } from 'oxide.ts';
import { routesV1 } from '@config/app.routes';
import { ApiErrorResponse } from '@libs/api/api-error.response';
import { CurrentUser } from '@modules/auth/current-user.decorator';
import { GuestUser } from '@modules/auth/domain/authenticated-user';
import { DriverRegistrationEntity } from '@modules/registration/domain/driver-registration.entity';
import {
  RegistrationNotFoundError,
  RegistrationVehicleLicenceTakenError,
  RegistrationVehiclePlateTakenError,
} from '@modules/registration/domain/registration.errors';
import { RegistrationResponseDto } from '@modules/registration/dtos/registration.response.dto';
import { RegistrationMapper } from '@modules/registration/registration.mapper';
import { SaveRegistrationVehicleCommand } from './save-registration-vehicle.command';
import { SaveRegistrationVehicleRequestDto } from './save-registration-vehicle.request.dto';
import { SaveRegistrationVehicleError } from './save-registration-vehicle.service';

@Controller(routesV1.version)
export class SaveRegistrationVehicleHttpController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly mapper: RegistrationMapper,
  ) {}

  @ApiOperation({ summary: 'Save the driver\'s vehicle ("Votre taxi")' })
  @ApiResponse({ status: HttpStatus.OK, type: RegistrationResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ApiErrorResponse })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description:
      'REGISTRATION.VEHICLE_PLATE_INVALID, REGISTRATION.NOT_DRIVER or ' +
      'REGISTRATION.ALREADY_COMPLETE',
    type: ApiErrorResponse,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description:
      'REGISTRATION.VEHICLE_PLATE_TAKEN or REGISTRATION.VEHICLE_LICENCE_TAKEN',
    type: ApiErrorResponse,
  })
  @Put(routesV1.registrationFlow.vehicle)
  async save(
    @Body() body: SaveRegistrationVehicleRequestDto,
    @CurrentUser() user: GuestUser,
  ): Promise<RegistrationResponseDto> {
    const result: Result<
      DriverRegistrationEntity,
      SaveRegistrationVehicleError
    > = await this.commandBus.execute(
      new SaveRegistrationVehicleCommand({ userId: user.id, ...body }),
    );

    return match(result, {
      Ok: (registration: DriverRegistrationEntity) =>
        this.mapper.toResponse(registration),
      Err: (error: SaveRegistrationVehicleError) => {
        if (error instanceof RegistrationNotFoundError) {
          throw new NotFoundException(error.message);
        }
        if (
          error instanceof RegistrationVehiclePlateTakenError ||
          error instanceof RegistrationVehicleLicenceTakenError
        ) {
          throw new ConflictException({
            message: error.message,
            code: error.code,
          });
        }
        throw new UnprocessableEntityException({
          message: error.message,
          code: error.code,
        });
      },
    });
  }
}
