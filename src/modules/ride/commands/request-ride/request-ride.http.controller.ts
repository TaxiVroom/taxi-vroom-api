import { Body, Controller, HttpStatus, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Result } from 'oxide.ts';
import { routesV1 } from '@config/app.routes';
import { IdResponse } from '@libs/api/id.response.dto';
import { AggregateID } from '@libs/ddd';
import { CurrentUser } from '@modules/auth/current-user.decorator';
import { RegisteredUser } from '@modules/auth/domain/authenticated-user';
import { Roles } from '@modules/auth/roles.decorator';
import { UserRoles } from '@modules/user/domain/user.types';
import { RequestRideCommand } from './request-ride.command';
import { RequestRideRequestDto } from './request-ride.request.dto';

@Controller(routesV1.version)
export class RequestRideHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @ApiOperation({
    summary: 'Request a ride: it is proposed to the closest free driver',
  })
  @ApiResponse({ status: HttpStatus.CREATED, type: IdResponse })
  @Roles(UserRoles.passenger)
  @Post(routesV1.ride.root)
  async request(
    @CurrentUser() user: RegisteredUser,
    @Body() body: RequestRideRequestDto,
  ): Promise<IdResponse> {
    const result: Result<AggregateID, never> = await this.commandBus.execute(
      new RequestRideCommand({
        passengerId: user.id,
        // The pickup address is not looked up yet.
        origin: {
          name: null,
          latitude: body.originLatitude,
          longitude: body.originLongitude,
        },
        destination: {
          name: body.destinationName,
          latitude: body.destinationLatitude,
          longitude: body.destinationLongitude,
        },
        estimatedPrice: {
          minCents: body.estimatedPriceMinCents,
          maxCents: body.estimatedPriceMaxCents,
        },
      }),
    );
    return new IdResponse(result.unwrap());
  }
}
