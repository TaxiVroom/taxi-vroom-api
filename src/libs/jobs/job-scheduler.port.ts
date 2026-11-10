// A job to run at a given time, found again by its key: scheduling the same
// key again replaces it. Spec docs/specs/documents-du-chauffeur.md, point 12.
export interface ScheduledJob {
  // The task to run, e.g. "document-reminder".
  task: string;
  payload: Record<string, unknown>;
  runAt: Date;
  // E.g. "document:<driverId>:<documentTypeId>:expiry".
  key: string;
}

export interface JobSchedulerPort {
  // In the current transaction when one is open: the job exists only if the
  // writes around it are saved.
  schedule(jobs: ScheduledJob[]): Promise<void>;
  remove(keys: string[]): Promise<void>;
}

// What a task does with its payload. A thrown error makes the job run again
// later.
export type JobTask = (payload: unknown) => Promise<void>;
