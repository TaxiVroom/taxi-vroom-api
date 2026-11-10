import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { Err, Ok, Result } from 'oxide.ts';
import { DriverEntity } from '@modules/driver/domain/driver.entity';
import { DriverDocumentsBlockingError } from '@modules/driver/domain/driver.errors';
import { DriverOnlinePermissionPort } from '@modules/driver/application/ports/driver-online-permission.port';
import { DRIVER_ONLINE_PERMISSION } from '@modules/driver/driver.di-tokens';
import {
  DriverDocumentStatesReadModel,
  GetDriverDocumentStatesQuery,
} from '@modules/driver/queries/get-driver-document-states/get-driver-document-states.query-handler';
import { GoOnlineCommand } from './go-online.command';

// "Passer en ligne": allowed in Firebase only when no document blocks; the
// app then writes its presence itself. Spec
// docs/specs/documents-du-chauffeur.md, point 8.
@CommandHandler(GoOnlineCommand)
export class GoOnlineService implements ICommandHandler {
  constructor(
    private readonly queryBus: QueryBus,
    @Inject(DRIVER_ONLINE_PERMISSION)
    private readonly permission: DriverOnlinePermissionPort,
  ) {}

  async execute(
    command: GoOnlineCommand,
  ): Promise<Result<null, DriverDocumentsBlockingError>> {
    const [states]: DriverDocumentStatesReadModel[] =
      await this.queryBus.execute(
        new GetDriverDocumentStatesQuery({ driverIds: [command.driverId] }),
      );
    const allowed = DriverEntity.goOnline(states.isBlocked);
    if (allowed.isErr()) return Err(allowed.unwrapErr());
    await this.permission.allow(command.driverId);
    return Ok(null);
  }
}
