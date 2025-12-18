import { prisma } from "@/lib/db/prisma";
import { signToken, type JwtPayload } from "@/lib/auth/jwt";
import { verifyPassword } from "@/lib/auth/password";
import { ApiError } from "@/lib/http/errors";

export async function signIn(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, email: true, role: true, passwordHash: true, name: true }
  });

  if (!user) throw new ApiError(401, "UNAUTHORIZED", "Invalid credentials");

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) throw new ApiError(401, "UNAUTHORIZED", "Invalid credentials");

  const payload: JwtPayload = {
    userId: user.id,
    role: user.role === "BUSINESS" ? "BUSINESS" : "CLIENT"
  };

  const token = signToken(payload);

  return {
    token,
    user: { id: user.id, email: user.email, name: user.name, role: payload.role }
  };
}
