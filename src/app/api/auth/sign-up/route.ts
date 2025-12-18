import { signUpSchema } from "@/lib/validation/auth";
import { createUser } from "@/lib/services/users.service";
import { jsonCreated, jsonError, validationError } from "@/lib/http/response";
import { signToken, type JwtPayload } from "@/lib/auth/jwt";
import { setAuthCookie } from "@/lib/auth/cookies";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = signUpSchema.safeParse(body);
    if (!parsed.success) throw validationError(parsed.error.flatten());

    const user = await createUser(parsed.data);

    const payload: JwtPayload = {
      userId: user.id,
      role: user.role === "BUSINESS" ? "BUSINESS" : "CLIENT"
    };
    const token = signToken(payload);

    const res = jsonCreated({
      user: { id: user.id, name: user.name, email: user.email, role: payload.role }
    });
    setAuthCookie(res, token);
    return res;
  } catch (e) {
    return jsonError(e);
  }
}
