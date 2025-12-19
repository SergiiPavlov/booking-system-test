const { PrismaClient, UserRole } = require('@prisma/client');
const bcrypt = require('bcryptjs');

(async () => {
  const prisma = new PrismaClient();
  try {
    const passwordHash = await bcrypt.hash('Admin123!', 10);

    const u = await prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: { role: UserRole.ADMIN, name: 'Admin', passwordHash },
      create: { role: UserRole.ADMIN, name: 'Admin', email: 'admin@example.com', passwordHash },
      select: { email: true, role: true },
    });

    console.log('UPDATED:', u.email, u.role);

    const check = await prisma.user.findUnique({
      where: { email: 'admin@example.com' },
      select: { passwordHash: true },
    });

    const ok = await bcrypt.compare('Admin123!', check.passwordHash);
    console.log('VERIFY_COMPARE(Admin123!):', ok);

    if (!ok) {
      process.exitCode = 2;
    }
  } catch (e) {
    console.error('ERROR:', e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
