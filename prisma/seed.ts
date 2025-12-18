import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("Password123!", 10);

  const [business1, business2, client1, client2] = await Promise.all([
    prisma.user.upsert({
      where: { email: "biz1@example.com" },
      update: {},
      create: { role: UserRole.BUSINESS, name: "Business One", email: "biz1@example.com", passwordHash: password }
    }),
    prisma.user.upsert({
      where: { email: "biz2@example.com" },
      update: {},
      create: { role: UserRole.BUSINESS, name: "Business Two", email: "biz2@example.com", passwordHash: password }
    }),
    prisma.user.upsert({
      where: { email: "client1@example.com" },
      update: {},
      create: { role: UserRole.CLIENT, name: "Client One", email: "client1@example.com", passwordHash: password }
    }),
    prisma.user.upsert({
      where: { email: "client2@example.com" },
      update: {},
      create: { role: UserRole.CLIENT, name: "Client Two", email: "client2@example.com", passwordHash: password }
    })
  ]);

  console.log("Seeded users:");
  console.log({ business1: business1.email, business2: business2.email, client1: client1.email, client2: client2.email });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
