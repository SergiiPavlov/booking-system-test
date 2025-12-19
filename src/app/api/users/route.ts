import { requireAuth } from "@/lib/auth/requireAuth";
import { jsonCreated, jsonError, jsonOk, validationError } from "@/lib/http/response";
import { forbidden } from "@/lib/http/errors";
import { createUserSchema } from "@/lib/validation/users";
import { createUser, listUsers } from "@/lib/services/users.service";

export async function GET(req: Request) {
  try {
    const auth = await requireAuth();
    const url = new URL(req.url);
    const role = url.searchParams.get("role") as "CLIENT" | "BUSINESS" | "ADMIN" | null;

    // Security:
    // - Any authenticated user may list businesses (used by /businesses UI).
    // - Any other listing requires ADMIN.
    if (role !== "BUSINESS" && auth.role !== "ADMIN") {
      throw forbidden("Only ADMIN can list users");
    }

    const users = await listUsers(role ?? undefined);
    return jsonOk({ users });
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAuth();
    if (auth.role !== "ADMIN") throw forbidden("Only ADMIN can create users");
    const body = await req.json();
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) throw validationError(parsed.error.flatten());

    const user = await createUser(parsed.data);
    return jsonCreated({ user });
  } catch (e) {
    return jsonError(e);
  }
}
