import { NextResponse } from "next/server";
import { signInSchema } from "@/lib/validation/auth";
import { jsonError, jsonOk, validationError } from "@/lib/http/response";
import { signIn } from "@/lib/services/auth.service";
import { setAuthCookie } from "@/lib/auth/cookies";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = signInSchema.safeParse(body);
    if (!parsed.success) throw validationError(parsed.error.flatten());

    const result = await signIn(parsed.data.email, parsed.data.password);
    const res = jsonOk({ user: result.user });
    setAuthCookie(res, result.token);
    return res;
  } catch (e) {
    return jsonError(e);
  }
}
