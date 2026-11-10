import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { OnEvent } from '@nestjs/event-emitter';
import { RideEndedDomainEvent } from '@modules/ride/domain/events/ride-ended.domain-event';
import { TakeBlockedDriversOfflineCommand } from '@modules/driver/commands/take-blocked-drivers-offline/take-blocked-drivers-offline.command';

// A ride is never stopped for a document: once it ends, a driver whose
// documents block goes offline. The command never fails, so the end of the
// ride never does. Spec docs/specs/documents-du-chauffeur.md, point 8.
@Injectable()
export class TakeDriverOfflineWhenRideEndedDomainEventHandler {
  constructor(private readonly commandBus: CommandBus) {}

  @OnEvent(RideEndedDomainEvent.name, { async: true, promisify: true })
  async handle(event: RideEndedDomainEvent): Promise<void> {
    await this.commandBus.execute(
      new TakeBlockedDriversOfflineCommand({
        driverIds: [event.driverId],
        exceptRideId: event.aggregateId,
      }),
    );
  }
}
