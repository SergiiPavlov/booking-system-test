import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME } from "./cookies";
import { verifyToken, type JwtPayload } from "./jwt";

export async function getAuthFromRequest(): Promise<JwtPayload | null> {
  // Next.js 15+ treats `cookies()` as a dynamic API that must be awaited in Route Handlers.
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}

export async function requireAuth(): Promise<JwtPayload> {
  const auth = await getAuthFromRequest();
  if (!auth) {
    // route handlers will translate this error to 401
    throw Object.assign(new Error("Unauthorized"), { code: "UNAUTHORIZED" as const });
  }
  return auth;
}
