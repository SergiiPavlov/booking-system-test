import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { Prisma, UserRole } from "@prisma/client";
import { conflict } from "@/lib/http/errors";

export async function createUser(input: {
  name: string;
  email: string;
  password: string;
  role: "CLIENT" | "BUSINESS" | "ADMIN";
}) {
  const passwordHash = await hashPassword(input.password.trim());
  try {
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email.trim().toLowerCase(),
        role:
          input.role === "ADMIN"
            ? UserRole.ADMIN
            : input.role === "BUSINESS"
              ? UserRole.BUSINESS
              : UserRole.CLIENT,
        passwordHash
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true }
    });
    return user;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw conflict("Email already exists", { field: "email" });
    }
    throw e;
  }
}

export async function listUsers(role?: "CLIENT" | "BUSINESS" | "ADMIN") {
  const where = role
    ? {
        role:
          role === "ADMIN" ? UserRole.ADMIN : role === "BUSINESS" ? UserRole.BUSINESS : UserRole.CLIENT
      }
    : {};
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
  input: Partial<{ name: string; email: string; password: string; role: "CLIENT" | "BUSINESS" | "ADMIN" }>
) {
  const data: any = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.email !== undefined) data.email = input.email.trim().toLowerCase();
  if (input.role !== undefined)
    data.role =
      input.role === "ADMIN" ? UserRole.ADMIN : input.role === "BUSINESS" ? UserRole.BUSINESS : UserRole.CLIENT;
  if (input.password !== undefined) data.passwordHash = await hashPassword(input.password.trim());

  try {
    return await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true }
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw conflict("Email already exists", { field: "email" });
    }
    throw e;
  }
}

export async function deleteUser(id: string) {
  await prisma.user.delete({ where: { id } });
}
