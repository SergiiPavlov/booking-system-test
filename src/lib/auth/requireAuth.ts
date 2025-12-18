import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME } from "./cookies";
import { verifyToken, type JwtPayload } from "./jwt";

export function getAuthFromRequest(): JwtPayload | null {
  const token = cookies().get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}

export function requireAuth(): JwtPayload {
  const auth = getAuthFromRequest();
  if (!auth) {
    // route handlers will translate this error to 401
    throw Object.assign(new Error("Unauthorized"), { code: "UNAUTHORIZED" as const });
  }
  return auth;
}
