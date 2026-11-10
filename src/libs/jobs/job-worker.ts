import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { run, Runner, TaskList } from 'graphile-worker';
import { RequestContext } from 'nestjs-request-context';
import { EnvConfig } from '@config/env.validation';
import { JobTask } from './job-scheduler.port';

// Runs the jobs due, inside this server. The modules register their tasks
// when they start; the worker starts once all of them did. At its start,
// Graphile Worker creates or updates its own schema, graphile_worker.
// https://worker.graphile.org/docs/library/run
// https://worker.graphile.org/docs/tasks
@Injectable()
export class JobWorker
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(JobWorker.name);
  private readonly tasks: TaskList = {};
  private runner: Runner | undefined;

  constructor(private readonly configService: ConfigService<EnvConfig, true>) {}

  register(name: string, task: JobTask): void {
    // Outside any HTTP request: each job runs in its own request context,
    // which transactions rely on.
    this.tasks[name] = async (payload) => {
      const context = new RequestContext({ requestId: `job-${name}` }, {});
      await RequestContext.cls.run(context, () => task(payload));
    };
  }

  async onApplicationBootstrap(): Promise<void> {
    this.runner = await run({
      connectionString: this.configService.get('DATABASE_URL'),
      taskList: this.tasks,
      concurrency: 2,
      // NestJS stops the server: the worker is stopped with it.
      noHandleSignals: true,
    });
    this.logger.log(`Worker started: ${Object.keys(this.tasks).join(', ')}`);
  }

  // Waits for the jobs in progress.
  async onApplicationShutdown(): Promise<void> {
    await this.runner?.stop();
  }
}
