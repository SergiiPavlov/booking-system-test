import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function timeToMin(t: string): number {
  const [h, m] = t.split(':').map((x) => Number(x));
  return h * 60 + m;
}

async function ensureDefaultAvailabilityForBusiness(businessId: string) {
  // Default schedule (easy to explain + practical for demo):
  // - Mon..Fri: 09:00-17:00 with break 13:00-14:00
  // - Sat: 10:00-14:00
  // - Sun: off
  const working: Array<{ dayOfWeek: number; startMin: number; endMin: number }> = [];
  for (let dow = 1; dow <= 5; dow++) {
    working.push({ dayOfWeek: dow, startMin: timeToMin('09:00'), endMin: timeToMin('17:00') });
  }
  working.push({ dayOfWeek: 6, startMin: timeToMin('10:00'), endMin: timeToMin('14:00') });

  // Upsert working hours
  for (const w of working) {
    await prisma.businessWorkingHour.upsert({
      where: { businessId_dayOfWeek: { businessId, dayOfWeek: w.dayOfWeek } },
      update: { startMin: w.startMin, endMin: w.endMin },
      create: { businessId, dayOfWeek: w.dayOfWeek, startMin: w.startMin, endMin: w.endMin },
    });
  }

  // Remove any “Sunday” record if it was created earlier by mistake.
  await prisma.businessWorkingHour.deleteMany({ where: { businessId, dayOfWeek: 0 } });

  // Replace breaks (keep it deterministic for seed)
  await prisma.businessBreak.deleteMany({ where: { businessId } });
  await prisma.businessBreak.createMany({
    data: [
      { businessId, dayOfWeek: 1, startMin: timeToMin('13:00'), endMin: timeToMin('14:00') },
      { businessId, dayOfWeek: 2, startMin: timeToMin('13:00'), endMin: timeToMin('14:00') },
      { businessId, dayOfWeek: 3, startMin: timeToMin('13:00'), endMin: timeToMin('14:00') },
      { businessId, dayOfWeek: 4, startMin: timeToMin('13:00'), endMin: timeToMin('14:00') },
      { businessId, dayOfWeek: 5, startMin: timeToMin('13:00'), endMin: timeToMin('14:00') },
    ],
    skipDuplicates: true,
  });
}

async function main() {
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'client1@example.com' },
      update: {},
      create: {
        role: UserRole.CLIENT,
        name: 'Client One',
        email: 'client1@example.com',
        passwordHash,
      },
    }),
    prisma.user.upsert({
      where: { email: 'biz1@example.com' },
      update: {},
      create: {
        role: UserRole.BUSINESS,
        name: 'Business One',
        email: 'biz1@example.com',
        passwordHash,
      },
    }),
    prisma.user.upsert({
      where: { email: 'biz2@example.com' },
      update: {},
      create: {
        role: UserRole.BUSINESS,
        name: 'Business Two',
        email: 'biz2@example.com',
        passwordHash,
      },
    }),
  ]);

  const businessUsers = users.filter((u) => u.role === UserRole.BUSINESS);
  for (const b of businessUsers) {
    await ensureDefaultAvailabilityForBusiness(b.id);
  }

  console.log('Seeded:', users.map((u) => ({ email: u.email, role: u.role })));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
