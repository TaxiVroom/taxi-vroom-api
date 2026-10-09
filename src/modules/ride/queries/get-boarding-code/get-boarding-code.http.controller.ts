import {
  Controller,
  Get,
  HttpStatus,
  NotFoundException,
  Param,
} from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { match, Result } from 'oxide.ts';
import { routesV1 } from '@config/app.routes';
import { ApiErrorResponse } from '@libs/api/api-error.response';
import { CurrentUser } from '@modules/auth/current-user.decorator';
import { RegisteredUser } from '@modules/auth/domain/authenticated-user';
import { Roles } from '@modules/auth/roles.decorator';
import { UserRoles } from '@modules/user/domain/user.types';
import { RideNotFoundError } from '@modules/ride/domain/ride.errors';
import { BoardingCodeResponseDto } from '@modules/ride/dtos/boarding-code.response.dto';
import { GetBoardingCodeQuery } from './get-boarding-code.query-handler';

@Controller(routesV1.version)
export class GetBoardingCodeHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @ApiOperation({ summary: 'The boarding code of the passenger’s ride' })
  @ApiResponse({ status: HttpStatus.OK, type: BoardingCodeResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, type: ApiErrorResponse })
  @Roles(UserRoles.passenger)
  @Get(routesV1.ride.boardingCode)
  async getBoardingCode(
    @CurrentUser() user: RegisteredUser,
    @Param('rideId') rideId: string,
  ): Promise<BoardingCodeResponseDto> {
    const result: Result<string, RideNotFoundError> =
      await this.queryBus.execute(
        new GetBoardingCodeQuery({ rideId, passengerId: user.id }),
      );

    return match(result, {
      Ok: (code: string) => {
        const response = new BoardingCodeResponseDto();
        response.code = code;
        return response;
      },
      Err: (error: Error) => {
        if (error instanceof RideNotFoundError) {
          throw new NotFoundException(error.message);
        }
        throw error;
      },
    });
  }
}
