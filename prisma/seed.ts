import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

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

  console.log('Seed done');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
