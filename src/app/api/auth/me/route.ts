import { requireAuth } from "@/lib/auth/requireAuth";
import { prisma } from "@/lib/db/prisma";
import { jsonError, jsonOk } from "@/lib/http/response";

export async function GET() {
  try {
    const auth = await requireAuth();
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true }
    });
    return jsonOk({ user });
  } catch (e) {
    return jsonError(e);
  }
}
