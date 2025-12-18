import { signUpSchema } from "@/lib/validation/auth";
import { createUser } from "@/lib/services/users.service";
import { jsonCreated, jsonError, validationError } from "@/lib/http/response";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = signUpSchema.safeParse(body);
    if (!parsed.success) throw validationError(parsed.error.flatten());

    const user = await createUser(parsed.data);
    return jsonCreated({ user });
  } catch (e) {
    return jsonError(e);
  }
}
