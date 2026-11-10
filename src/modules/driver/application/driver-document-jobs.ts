import { Inject, Injectable } from '@nestjs/common';
import { isAfter, subDays } from 'date-fns';
import { JobSchedulerPort, ScheduledJob } from '@libs/jobs/job-scheduler.port';
import { JOB_SCHEDULER } from '@libs/jobs/jobs.di-tokens';
import {
  documentJobKeys,
  documentReminderDaysBefore,
  documentTasks,
} from '@modules/driver/driver-documents.config';

// A document of a driver with its end of validity, or none.
export interface DocumentDates {
  driverId: string;
  documentTypeId: string;
  expiresAt: Date | null;
}

// The jobs of a driver's documents: the reminders and the expiry, found
// again by their keys, so a renewed document replaces them. Called in the
// transaction of the write: the jobs exist only if it is saved. Spec
// docs/specs/documents-du-chauffeur.md.
@Injectable()
export class DriverDocumentJobs {
  constructor(
    @Inject(JOB_SCHEDULER) private readonly scheduler: JobSchedulerPort,
  ) {}

  async schedule(documents: DocumentDates[], now: Date): Promise<void> {
    const jobs: ScheduledJob[] = [];
    const stale: string[] = [];
    for (const document of documents) {
      this.planFor(document, now, jobs, stale);
    }
    await this.scheduler.remove(stale);
    await this.scheduler.schedule(jobs);
  }

  // A date already passed, or no date: its job goes, if there was one.
  private planFor(
    { driverId, documentTypeId, expiresAt }: DocumentDates,
    now: Date,
    jobs: ScheduledJob[],
    stale: string[],
  ): void {
    for (const daysBefore of documentReminderDaysBefore) {
      const key = documentJobKeys.reminder(
        driverId,
        documentTypeId,
        daysBefore,
      );
      const runAt = expiresAt ? subDays(expiresAt, daysBefore) : null;
      if (!runAt || !isAfter(runAt, now)) {
        stale.push(key);
        continue;
      }
      const payload = { driverId, documentTypeId, daysBefore };
      jobs.push({ task: documentTasks.reminder, payload, runAt, key });
    }
    const expiryKey = documentJobKeys.expiry(driverId, documentTypeId);
    if (!expiresAt) {
      stale.push(expiryKey);
      return;
    }
    jobs.push({
      task: documentTasks.expiry,
      payload: { driverId, documentTypeId },
      runAt: expiresAt,
      key: expiryKey,
    });
  }
}
