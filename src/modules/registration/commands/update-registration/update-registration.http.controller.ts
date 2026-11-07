import {
  Body,
  Controller,
  HttpStatus,
  NotFoundException,
  Patch,
} from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CommandBus } from '@nestjs/cqrs';
import { match, Result } from 'oxide.ts';
import { routesV1 } from '@config/app.routes';
import { CurrentUser } from '@modules/auth/current-user.decorator';
import { GuestUser } from '@modules/auth/domain/authenticated-user';
import { ApiErrorResponse } from '@libs/api/api-error.response';
import { RegistrationEntity } from '@modules/registration/domain/registration.entity';
import { RegistrationBaseProps } from '@modules/registration/domain/registration.types';
import { RegistrationResponseDto } from '@modules/registration/dtos/registration.response.dto';
import { RegistrationNotFoundError } from '@modules/registration/domain/registration.errors';
import { RegistrationMapper } from '@modules/registration/registration.mapper';
import { UpdateRegistrationCommand } from './update-registration.command';
import { UpdateRegistrationRequestDto } from './update-registration.request.dto';

@Controller(routesV1.version)
export class UpdateRegistrationHttpController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly mapper: RegistrationMapper,
  ) {}

  @ApiOperation({ summary: 'Advance to the next registration step' })
  @ApiResponse({
    status: HttpStatus.OK,
    type: RegistrationResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ApiErrorResponse })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, type: ApiErrorResponse })
  @Patch(routesV1.registrationFlow.me)
  async update(
    @Body() body: UpdateRegistrationRequestDto,
    @CurrentUser() user: GuestUser,
  ): Promise<RegistrationResponseDto> {
    const result: Result<
      RegistrationEntity<RegistrationBaseProps>,
      RegistrationNotFoundError
    > = await this.commandBus.execute(
      new UpdateRegistrationCommand({ userId: user.id, ...body }),
    );

    return match(result, {
      Ok: (entity: RegistrationEntity<RegistrationBaseProps>) =>
        this.mapper.toResponse(entity),
      Err: (error: Error) => {
        if (error instanceof RegistrationNotFoundError)
          throw new NotFoundException(error.message);
        throw error;
      },
    });
  }
}
