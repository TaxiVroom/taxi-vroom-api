import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const documentTypes = [
  { id: '2440d6b5-eded-4fd9-8f89-48e87a210b64', name: "Permis de conduire",              backRequired: true  },
  { id: '55dd6b77-1dd6-4886-9b7d-0ca381fc1f5a', name: "Carte grise",                     backRequired: false },
  { id: 'ba2a7b6c-765c-4fda-a30b-b3485b8913ed', name: "Carte professionnelle de taxi",   backRequired: true  },
  { id: '87b1e1d2-e94c-4190-8e89-4106a6758230', name: "Carte d'identité",                backRequired: true  },
];

async function main() {
  const user = await prisma.user.create({
    data: {
      id: 'f59d0748-d455-4465-b0a8-8d8260b1c877',
      email: 'john@gmail.com',
      phone: '+33685456565',
      firstName: 'John',
      lastName: 'Doe',
      // country: 'England',
      // postalCode: '24312',
      // street: 'Road Avenue',
      role: 'PASSENGER',
      // role: 'guest',
    },
  });

  await prisma.wallet.create({
    data: {
      id: crypto.randomUUID(),
      userId: user.id,
      balance: 0,
    },
  });

  for (const documentType of documentTypes) {
    await prisma.documentType.upsert({
      where: { id: documentType.id },
      update: {},
      create: documentType,
    });
  }

  console.log('Seed done');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
