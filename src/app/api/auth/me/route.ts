import { getAuthFromRequest } from "@/lib/auth/requireAuth";
import { prisma } from "@/lib/db/prisma";
import { jsonError, jsonOk } from "@/lib/http/response";

export async function GET() {
  try {
    // NOTE: This endpoint is called by the header on every page.
    // Returning 401 for anonymous users makes DevTools show noisy "GET ... 401" errors.
    // For UI purposes, anonymous is not an exceptional condition.
    const auth = await getAuthFromRequest();
    if (!auth) {
      return jsonOk({ user: null });
    }
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true }
    });
    return jsonOk({ user });
  } catch (e) {
    return jsonError(e);
  }
}
