import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { UserRole } from "@prisma/client";

export async function createUser(input: {
  name: string;
  email: string;
  password: string;
  role: "CLIENT" | "BUSINESS";
}) {
  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email.toLowerCase(),
      role: input.role === "BUSINESS" ? UserRole.BUSINESS : UserRole.CLIENT,
      passwordHash
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true }
  });
  return user;
}

export async function listUsers(role?: "CLIENT" | "BUSINESS") {
  const where = role ? { role: role === "BUSINESS" ? UserRole.BUSINESS : UserRole.CLIENT } : {};
  return prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true }
  });
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true }
  });
}

export async function updateUser(
  id: string,
  input: Partial<{ name: string; email: string; password: string; role: "CLIENT" | "BUSINESS" }>
) {
  const data: any = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.email !== undefined) data.email = input.email.toLowerCase();
  if (input.role !== undefined) data.role = input.role === "BUSINESS" ? UserRole.BUSINESS : UserRole.CLIENT;
  if (input.password !== undefined) data.passwordHash = await hashPassword(input.password);

  return prisma.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true }
  });
}

export async function deleteUser(id: string) {
  await prisma.user.delete({ where: { id } });
}
