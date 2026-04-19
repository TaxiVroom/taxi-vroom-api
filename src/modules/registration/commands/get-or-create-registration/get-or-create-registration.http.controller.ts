import {
  Controller,
  Get,
  HttpStatus,
  Query,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CommandBus } from '@nestjs/cqrs';
import { match, Result } from 'oxide.ts';
import { routesV1 } from '@config/app.routes';
import { ApiErrorResponse } from '@libs/api/api-error.response';
import { RegistrationEntity } from '@modules/registration/domain/registration.entity';
import { RegistrationBaseProps } from '@modules/registration/domain/registration.types';
import { RegistrationResponseDto } from '@modules/registration/dtos/registration.response.dto';
import { CurrentUser } from '@modules/auth/current-user.decorator';
import { GuestUser } from '@modules/auth/domain/authenticated-user';
import { GetOrCreateRegistrationCommand } from './get-or-create-registration.command';
import { GetOrCreateRegistrationRequestDto } from './get-or-create-registration.request.dto';

@Controller(routesV1.version)
export class GetOrCreateRegistrationHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @ApiOperation({ summary: 'Get or create a registration flow' })
  @ApiResponse({
    status: HttpStatus.OK,
    type: RegistrationResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, type: ApiErrorResponse })
  @Get(routesV1.registrationFlow.me)
  async getOrCreate(
    @Query() query: GetOrCreateRegistrationRequestDto,
    @CurrentUser() user: GuestUser,
  ): Promise<RegistrationResponseDto> {
    const result: Result<
      RegistrationEntity<RegistrationBaseProps>,
      never
    > = await this.commandBus.execute(
      new GetOrCreateRegistrationCommand({
        userId: user.id,
        role: query.role,
        phone: query.phone ?? null,
      }),
    );

    return match(result, {
      Ok: (entity: RegistrationEntity<RegistrationBaseProps>) => {
        const props = entity.getProps();
        const response = new RegistrationResponseDto(props);
        response.role = props.role;
        response.currentStep = entity.currentStep;
        response.email = props.email;
        response.firstName = props.firstName;
        response.lastName = props.lastName;
        return response;
      },
      Err: (error: Error) => {
        throw new UnprocessableEntityException(error.message);
      },
    });
  }
}
