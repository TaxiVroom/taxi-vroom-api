import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { QueryBus } from '@nestjs/cqrs';
import { Result } from 'oxide.ts';
import { routesV1 } from '@config/app.routes';
import { CurrentUser } from '@modules/auth/current-user.decorator';
import { GuestUser } from '@modules/auth/domain/authenticated-user';
import { ApiErrorResponse } from '@libs/api/api-error.response';
import { EmailAvailabilityResponseDto } from '@modules/registration/dtos/email-availability.response.dto';
import { CheckEmailAvailabilityQuery } from './check-email-availability.query-handler';
import { CheckEmailAvailabilityRequestDto } from './check-email-availability.request.dto';

@Controller(routesV1.version)
export class CheckEmailAvailabilityHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @ApiOperation({
    summary: 'Check if an email address is available for registration',
  })
  @ApiResponse({ status: HttpStatus.OK, type: EmailAvailabilityResponseDto })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, type: ApiErrorResponse })
  @Get(routesV1.registrationFlow.emailAvailability)
  async checkAvailability(
    @Query() query: CheckEmailAvailabilityRequestDto,
    @CurrentUser() user: GuestUser,
  ): Promise<EmailAvailabilityResponseDto> {
    const result: Result<boolean, never> = await this.queryBus.execute(
      new CheckEmailAvailabilityQuery({
        requestingUserId: user.id,
        email: query.email,
      }),
    );

    const response = new EmailAvailabilityResponseDto();
    response.isAvailable = result.unwrap();
    return response;
  }
}
