import { jsonError, jsonOk } from "@/lib/http/response";
import { clearAuthCookie } from "@/lib/auth/cookies";

export async function POST() {
  try {
    const res = jsonOk({ ok: true });
    clearAuthCookie(res);
    return res;
  } catch (e) {
    return jsonError(e);
  }
}
