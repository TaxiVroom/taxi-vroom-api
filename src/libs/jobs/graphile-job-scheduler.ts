import { Injectable } from '@nestjs/common';
import { RequestContextService } from '@libs/application/context/AppRequestContext';
import { PrismaService } from '@libs/db/prisma.service';
import { JobSchedulerPort, ScheduledJob } from './job-scheduler.port';

// Graphile Worker's own SQL functions, called through Prisma so that a job
// is added in the transaction of the request, like any other write. Raw SQL:
// Prisma has no client for these functions.
// https://worker.graphile.org/docs/sql-add-job
// https://worker.graphile.org/docs/job-key
@Injectable()
export class GraphileJobScheduler implements JobSchedulerPort {
  constructor(private readonly prisma: PrismaService) {}

  private get client(): any {
    return RequestContextService.getTransactionConnection() ?? this.prisma;
  }

  async schedule(jobs: ScheduledJob[]): Promise<void> {
    for (const job of jobs) {
      await this.client.$queryRaw`
        SELECT graphile_worker.add_job(
          ${job.task},
          payload := ${JSON.stringify(job.payload)}::json,
          run_at := ${job.runAt}::timestamptz,
          job_key := ${job.key}
        )`;
    }
  }

  async remove(keys: string[]): Promise<void> {
    for (const key of keys) {
      await this.client.$queryRaw`SELECT graphile_worker.remove_job(${key})`;
    }
  }
}
