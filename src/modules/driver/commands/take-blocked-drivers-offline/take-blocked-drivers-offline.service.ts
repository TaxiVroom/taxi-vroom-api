import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { DriverOnlinePermissionPort } from '@modules/driver/application/ports/driver-online-permission.port';
import { DRIVER_ONLINE_PERMISSION } from '@modules/driver/driver.di-tokens';
import {
  DriverDocumentStatesReadModel,
  GetDriverDocumentStatesQuery,
} from '@modules/driver/queries/get-driver-document-states/get-driver-document-states.query-handler';
import { FindDriversInRideQuery } from '@modules/ride/queries/find-drivers-in-ride/find-drivers-in-ride.query-handler';
import { TakeBlockedDriversOfflineCommand } from './take-blocked-drivers-offline.command';

// The drivers whose documents block are taken offline, except those in a
// ride: the passenger follows their presence, the end of the ride does it.
// Never fails: the dispatch offers them nothing anyway. Spec
// docs/specs/documents-du-chauffeur.md, point 8.
@CommandHandler(TakeBlockedDriversOfflineCommand)
export class TakeBlockedDriversOfflineService implements ICommandHandler {
  private readonly logger = new Logger(TakeBlockedDriversOfflineService.name);

  constructor(
    private readonly queryBus: QueryBus,
    @Inject(DRIVER_ONLINE_PERMISSION)
    private readonly permission: DriverOnlinePermissionPort,
  ) {}

  async execute(command: TakeBlockedDriversOfflineCommand): Promise<void> {
    try {
      const states: DriverDocumentStatesReadModel[] =
        await this.queryBus.execute(
          new GetDriverDocumentStatesQuery({ driverIds: command.driverIds }),
        );
      const blocked = states
        .filter((driver) => driver.isBlocked)
        .map((driver) => driver.driverId);
      const inRide: Set<string> = await this.queryBus.execute(
        new FindDriversInRideQuery({
          driverIds: blocked,
          exceptRideId: command.exceptRideId,
        }),
      );
      await this.permission.revoke(blocked.filter((id) => !inRide.has(id)));
    } catch (error) {
      this.logger.warn(
        `Drivers not taken offline: ${(error as Error).message}`,
      );
    }
  }
}
