import { Injectable, OnModuleInit } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { subMinutes } from 'date-fns';
import { JobWorker } from '@libs/jobs/job-worker';
import { SendPushToUsersCommand } from '@modules/notification/commands/send-push-to-users/send-push-to-users.command';
import { AskNewDocumentCommand } from '@modules/registration/commands/ask-new-document/ask-new-document.command';
import { TakeBlockedDriversOfflineCommand } from '@modules/driver/commands/take-blocked-drivers-offline/take-blocked-drivers-offline.command';
import { documentTasks } from '@modules/driver/driver-documents.config';
import {
  DriverDocumentState,
  DriverDocumentStateReadModel,
  DriverDocumentStatesReadModel,
  GetDriverDocumentStatesQuery,
} from '@modules/driver/queries/get-driver-document-states/get-driver-document-states.query-handler';
import { FindDriversWithoutDocumentQuery } from '@modules/driver/queries/find-drivers-without-document/find-drivers-without-document.query-handler';

const dayMs = 24 * 60 * 60 * 1000;

// "11 mars", in French time whatever the server's time zone.
const dayFormat = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris',
  day: 'numeric',
  month: 'long',
});

interface DocumentPayload {
  driverId: string;
  documentTypeId: string;
  daysBefore?: number;
}

interface TypePayload {
  documentTypeId: string;
  daysBefore?: number;
}

// What the jobs of the documents do at their time: notify, and take offline
// the drivers whose documents block. They write no state: it is computed
// from the dates. Spec docs/specs/documents-du-chauffeur.md, points 3, 4, 6
// and 8.
@Injectable()
export class DriverDocumentTasks implements OnModuleInit {
  constructor(
    private readonly worker: JobWorker,
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  onModuleInit(): void {
    this.worker.register(documentTasks.reminder, (payload) =>
      this.remind(payload as DocumentPayload),
    );
    this.worker.register(documentTasks.expiry, (payload) =>
      this.expire(payload as DocumentPayload),
    );
    this.worker.register(documentTasks.typeReminder, (payload) =>
      this.remindType(payload as TypePayload),
    );
    this.worker.register(documentTasks.typeDeadline, (payload) =>
      this.requireType(payload as TypePayload),
    );
    this.worker.register(documentTasks.validated, (payload) =>
      this.tellValidated(payload as DocumentPayload),
    );
    this.worker.register(documentTasks.typeAdded, (payload) =>
      this.commandBus.execute(
        new AskNewDocumentCommand({
          documentTypeId: (payload as TypePayload).documentTypeId,
        }),
      ),
    );
  }

  // "Votre carte professionnelle expire le 11 mars."
  private async remind({ driverId, documentTypeId }: DocumentPayload) {
    const document = await this.documentOf(driverId, documentTypeId);
    if (!document?.expiresAt) return;
    await this.push([driverId], 'Document à renouveler', [
      `${document.name} : valable jusqu'au ${this.lastDay(
        document.expiresAt,
      )}.`,
      'Envoyez le nouveau dans l’app pour continuer à rouler.',
    ]);
  }

  private async expire({ driverId, documentTypeId }: DocumentPayload) {
    const document = await this.documentOf(driverId, documentTypeId);
    if (document?.state !== DriverDocumentState.expired) return;
    await this.push([driverId], 'Document expiré', [
      `${document.name} a expiré : vous ne pouvez plus passer en ligne.`,
    ]);
    await this.commandBus.execute(
      new TakeBlockedDriversOfflineCommand({ driverIds: [driverId] }),
    );
  }

  // "Document validé", and whether the driver can drive again.
  private async tellValidated({ driverId, documentTypeId }: DocumentPayload) {
    const [states] = await this.statesOf([driverId]);
    const document = states?.documents.find(
      (state) => state.documentTypeId === documentTypeId,
    );
    if (!states || !document) return;
    const next = states.isBlocked
      ? 'Un autre document reste à envoyer.'
      : 'Vous pouvez de nouveau passer en ligne.';
    await this.push([driverId], 'Document validé', [
      `${document.name} : validé.`,
      next,
    ]);
  }

  private async remindType({ documentTypeId }: TypePayload) {
    const driverIds = await this.driversWithout(documentTypeId);
    const [first] = await this.statesOf(driverIds.slice(0, 1));
    const type = first?.documents.find(
      (document) => document.documentTypeId === documentTypeId,
    );
    if (!type?.requiredFrom) return;
    await this.push(driverIds, 'Nouveau document demandé', [
      `${type.name} : à fournir avant le ${this.day(type.requiredFrom)}.`,
    ]);
  }

  private async requireType({ documentTypeId }: TypePayload) {
    const driverIds = await this.driversWithout(documentTypeId);
    await this.push(driverIds, 'Document manquant', [
      'Un document obligatoire manque : vous ne pouvez plus passer en ligne.',
    ]);
    await this.commandBus.execute(
      new TakeBlockedDriversOfflineCommand({ driverIds }),
    );
  }

  private async documentOf(
    driverId: string,
    documentTypeId: string,
  ): Promise<DriverDocumentStateReadModel | undefined> {
    const [states] = await this.statesOf([driverId]);
    return states?.documents.find(
      (document) => document.documentTypeId === documentTypeId,
    );
  }

  private statesOf(
    driverIds: string[],
  ): Promise<DriverDocumentStatesReadModel[]> {
    return this.queryBus.execute(
      new GetDriverDocumentStatesQuery({ driverIds }),
    );
  }

  private driversWithout(documentTypeId: string): Promise<string[]> {
    return this.queryBus.execute(
      new FindDriversWithoutDocumentQuery({ documentTypeId }),
    );
  }

  private push(userIds: string[], title: string, lines: string[]) {
    return this.commandBus.execute(
      new SendPushToUsersCommand({
        userIds,
        title,
        body: lines.join(' '),
        expiresInMs: dayMs,
        data: { type: 'documents' },
      }),
    );
  }

  private day(date: Date): string {
    return dayFormat.format(date);
  }

  // The end is the next day at 00:00: the last valid day is the one before.
  private lastDay(end: Date): string {
    return dayFormat.format(subMinutes(end, 1));
  }
}
