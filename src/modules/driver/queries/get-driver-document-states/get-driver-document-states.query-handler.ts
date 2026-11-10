import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { addDays, isAfter, min } from 'date-fns';
import { QueryBase } from '@libs/ddd/query.base';
import { PrismaService } from '@libs/db/prisma.service';
import { lastParisDayBefore } from '@libs/utils/paris-day';
import { documentRenewalNoticeDays } from '@modules/driver/driver-documents.config';

export enum DriverDocumentState {
  valid = 'VALID',
  toRenew = 'TO_RENEW',
  expired = 'EXPIRED',
  // A new type, before its deadline.
  toProvide = 'TO_PROVIDE',
  missing = 'MISSING',
}

export interface DriverDocumentStateReadModel {
  documentTypeId: string;
  name: string;
  backRequired: boolean;
  expires: boolean;
  state: DriverDocumentState;
  // Its end of validity, or null: the day after its last valid day, at
  // 00:00 in Paris.
  expiresAt: Date | null;
  // Its last valid day in Paris, "2027-03-11", for the display.
  lastValidDay: string | null;
  // A new type's deadline, or null.
  requiredFrom: Date | null;
  // A document sent waits for the admin.
  inReview: boolean;
}

export interface DriverDocumentStatesReadModel {
  driverId: string;
  documents: DriverDocumentStateReadModel[];
  // Expired or missing: no going online, no ride offered.
  isBlocked: boolean;
  // From this time the driver is no longer in order, if nothing is renewed:
  // the bookings after it are not offered. Null: no end.
  inOrderUntil: Date | null;
}

export class GetDriverDocumentStatesQuery extends QueryBase {
  readonly driverIds: string[];

  constructor(props: GetDriverDocumentStatesQuery) {
    super();
    this.driverIds = props.driverIds;
  }
}

interface TypeRow {
  id: string;
  name: string;
  backRequired: boolean;
  expires: boolean;
  requiredFrom: Date | null;
}

interface DocumentRow {
  driverId: string;
  documentTypeId: string;
  expiresAt: Date | null;
}

const blockingStates = [
  DriverDocumentState.expired,
  DriverDocumentState.missing,
];

// The state of every document type for each driver, computed in this read
// from two facts, documents.expiresAt and document_types.requiredFrom, and
// the time: never stored. Three reads for all the drivers. Spec
// docs/specs/documents-du-chauffeur.md, point 13.
@QueryHandler(GetDriverDocumentStatesQuery)
export class GetDriverDocumentStatesQueryHandler implements IQueryHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    query: GetDriverDocumentStatesQuery,
  ): Promise<DriverDocumentStatesReadModel[]> {
    const driverId = { in: query.driverIds };
    const [types, documents, submissions] = await Promise.all([
      this.prisma.documentType.findMany({
        select: {
          id: true,
          name: true,
          backRequired: true,
          expires: true,
          requiredFrom: true,
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.document.findMany({
        where: { driverId },
        select: { driverId: true, documentTypeId: true, expiresAt: true },
      }),
      this.prisma.driverDocumentSubmission.findMany({
        where: { driverId },
        select: { driverId: true, documentTypeId: true },
      }),
    ]);
    const now = new Date();
    const sent = new Set(
      submissions.map((row) => `${row.driverId}:${row.documentTypeId}`),
    );
    return query.driverIds.map((id) => {
      const own = documents.filter((row) => row.driverId === id);
      const states = types.map((type) =>
        this.stateOf(
          type,
          own.find((row) => row.documentTypeId === type.id),
          sent.has(`${id}:${type.id}`),
          now,
        ),
      );
      return this.summary(id, states, now);
    });
  }

  private stateOf(
    type: TypeRow,
    document: DocumentRow | undefined,
    inReview: boolean,
    now: Date,
  ): DriverDocumentStateReadModel {
    const base = {
      inReview,
      documentTypeId: type.id,
      name: type.name,
      backRequired: type.backRequired,
      expires: type.expires,
      requiredFrom: type.requiredFrom,
      expiresAt: document?.expiresAt ?? null,
      lastValidDay: document?.expiresAt
        ? lastParisDayBefore(document.expiresAt)
        : null,
    };
    if (!document) {
      const beforeDeadline =
        type.requiredFrom !== null && isAfter(type.requiredFrom, now);
      const state = beforeDeadline
        ? DriverDocumentState.toProvide
        : DriverDocumentState.missing;
      return { ...base, state };
    }
    return { ...base, state: this.stateOfDates(document.expiresAt, now) };
  }

  private stateOfDates(expiresAt: Date | null, now: Date): DriverDocumentState {
    if (!expiresAt) return DriverDocumentState.valid;
    if (!isAfter(expiresAt, now)) return DriverDocumentState.expired;
    const noticeFrom = addDays(now, documentRenewalNoticeDays);
    if (!isAfter(expiresAt, noticeFrom)) return DriverDocumentState.toRenew;
    return DriverDocumentState.valid;
  }

  private summary(
    driverId: string,
    documents: DriverDocumentStateReadModel[],
    now: Date,
  ): DriverDocumentStatesReadModel {
    const isBlocked = documents.some((document) =>
      blockingStates.includes(document.state),
    );
    const ends = documents.flatMap((document) => {
      if (document.state === DriverDocumentState.toProvide) {
        return document.requiredFrom ? [document.requiredFrom] : [];
      }
      return document.expiresAt ? [document.expiresAt] : [];
    });
    const inOrderUntil = isBlocked ? now : ends.length ? min(ends) : null;
    return { driverId, documents, isBlocked, inOrderUntil };
  }
}
