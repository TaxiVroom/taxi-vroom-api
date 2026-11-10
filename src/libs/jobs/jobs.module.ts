import { Global, Module } from '@nestjs/common';
import { GraphileJobScheduler } from './graphile-job-scheduler';
import { JobWorker } from './job-worker';
import { JOB_SCHEDULER } from './jobs.di-tokens';

// The job queue (Graphile Worker), shared by the modules. Spec
// docs/specs/documents-du-chauffeur.md, point 12.
@Global()
@Module({
  providers: [
    JobWorker,
    { provide: JOB_SCHEDULER, useClass: GraphileJobScheduler },
  ],
  exports: [JobWorker, JOB_SCHEDULER],
})
export class JobsModule {}
