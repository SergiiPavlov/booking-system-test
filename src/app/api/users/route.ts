import { requireAuth } from "@/lib/auth/requireAuth";
import { jsonCreated, jsonError, jsonOk, validationError } from "@/lib/http/response";
import { createUserSchema } from "@/lib/validation/users";
import { createUser, listUsers } from "@/lib/services/users.service";

export async function GET(req: Request) {
  try {
    await requireAuth();
    const url = new URL(req.url);
    const role = url.searchParams.get("role") as "CLIENT" | "BUSINESS" | null;
    const users = await listUsers(role ?? undefined);
    return jsonOk({ users });
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(req: Request) {
  try {
    await requireAuth();
    const body = await req.json();
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) throw validationError(parsed.error.flatten());

    const user = await createUser(parsed.data);
    return jsonCreated({ user });
  } catch (e) {
    return jsonError(e);
  }
}
