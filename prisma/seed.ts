import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { subDays } from 'date-fns';
import { makeWorkerUtils } from 'graphile-worker';
import { PrismaClient } from '../src/generated/prisma/client';
import {
  documentJobKeys,
  documentReminderDaysBefore,
  documentTasks,
} from '../src/modules/driver/driver-documents.config';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

interface DocumentTypeSeed {
  id: string;
  name: string;
  backRequired: boolean;
  // Its date of end of validity is asked.
  expires: boolean;
  // For the drivers already registered; absent: required at once.
  requiredFrom?: Date;
}

// The documents asked to the drivers. Spec
// docs/specs/documents-du-chauffeur.md, points 4, 5 and 14.
//
// To add a document type, until the admin screen exists:
// 1. add a line below, with a new UUID, its name, backRequired, expires and,
//    for the drivers already registered, requiredFrom, from 00:00 in Paris
//    (e.g. new Date('2027-03-01T00:00:00+01:00'));
// 2. run `npm run db:seed`.
// The drivers see it at once ("à fournir", or blocking without
// requiredFrom); the seed also schedules its reminders, its deadline, and
// sends back to "Mes documents" the files waiting for the admin without it.
// Only a new type gets jobs: changing the date of an existing one does not
// reschedule them.
const documentTypes: DocumentTypeSeed[] = [
  { id: '2440d6b5-eded-4fd9-8f89-48e87a210b64', name: "Permis de conduire",            backRequired: true,  expires: true  },
  { id: '55dd6b77-1dd6-4886-9b7d-0ca381fc1f5a', name: "Carte grise",                   backRequired: false, expires: false },
  { id: 'ba2a7b6c-765c-4fda-a30b-b3485b8913ed', name: "Carte professionnelle de taxi", backRequired: true,  expires: true  },
  { id: '87b1e1d2-e94c-4190-8e89-4106a6758230', name: "Carte d'identité",              backRequired: true,  expires: true  },
];

// Graphile Worker's add_job, as the server does it.
// https://worker.graphile.org/docs/sql-add-job
async function addJob(
  task: string,
  payload: Record<string, unknown>,
  runAt: Date,
  key: string,
): Promise<void> {
  await prisma.$queryRaw`
    SELECT graphile_worker.add_job(
      ${task},
      payload := ${JSON.stringify(payload)}::json,
      run_at := ${runAt}::timestamptz,
      job_key := ${key}
    )`;
}

async function scheduleNewType(type: DocumentTypeSeed): Promise<void> {
  const now = new Date();
  const documentTypeId = type.id;
  await addJob(
    documentTasks.typeAdded,
    { documentTypeId },
    now,
    documentJobKeys.typeAdded(documentTypeId),
  );
  if (!type.requiredFrom) return;
  for (const daysBefore of documentReminderDaysBefore) {
    const runAt = subDays(type.requiredFrom, daysBefore);
    if (runAt <= now) continue;
    await addJob(
      documentTasks.typeReminder,
      { documentTypeId, daysBefore },
      runAt,
      documentJobKeys.typeReminder(documentTypeId, daysBefore),
    );
  }
  await addJob(
    documentTasks.typeDeadline,
    { documentTypeId },
    type.requiredFrom,
    documentJobKeys.typeDeadline(documentTypeId),
  );
}

async function seedDocumentTypes(): Promise<void> {
  for (const type of documentTypes) {
    const existing = await prisma.documentType.findUnique({
      where: { id: type.id },
      select: { id: true },
    });
    const data = {
      name: type.name,
      backRequired: type.backRequired,
      expires: type.expires,
      requiredFrom: type.requiredFrom ?? null,
    };
    await prisma.documentType.upsert({
      where: { id: type.id },
      update: data,
      create: { id: type.id, ...data },
    });
    if (!existing) await scheduleNewType(type);
  }
}

// The seed may run before the server ever started, on a new database:
// the job queue's schema is created first.
// https://worker.graphile.org/docs/library/queue
async function migrateJobQueue(): Promise<void> {
  const workerUtils = await makeWorkerUtils({
    connectionString: process.env.DATABASE_URL,
  });
  try {
    await workerUtils.migrate();
  } finally {
    await workerUtils.release();
  }
}

async function main() {
  await migrateJobQueue();

  // Rerunnable: the seed runs again each time a document type is added.
  const user = await prisma.user.upsert({
    where: { id: 'f59d0748-d455-4465-b0a8-8d8260b1c877' },
    update: {},
    create: {
      id: 'f59d0748-d455-4465-b0a8-8d8260b1c877',
      email: 'john@gmail.com',
      phone: '+33685456565',
      firstName: 'John',
      lastName: 'Doe',
      role: 'PASSENGER',
    },
  });

  const wallet = await prisma.wallet.findFirst({ where: { userId: user.id } });
  if (!wallet) {
    await prisma.wallet.create({
      data: { id: crypto.randomUUID(), userId: user.id, balance: 0 },
    });
  }

  await seedDocumentTypes();

  console.log('Seed done');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
