import { requireAuth } from "@/lib/auth/requireAuth";
import { ApiError } from "@/lib/http/errors";
import { jsonError, jsonOk, validationError } from "@/lib/http/response";
import { updateUserSchema } from "@/lib/validation/users";
import { deleteUser, getUserById, updateUser } from "@/lib/services/users.service";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    requireAuth();
    const { id } = await ctx.params;
    const user = await getUserById(id);
    if (!user) throw new ApiError(404, "NOT_FOUND", "User not found");
    return jsonOk({ user });
  } catch (e) {
    return jsonError(e);
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    requireAuth();
    const { id } = await ctx.params;
    const body = await req.json();
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) throw validationError(parsed.error.flatten());

    const user = await updateUser(id, parsed.data);
    return jsonOk({ user });
  } catch (e) {
    return jsonError(e);
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    requireAuth();
    const { id } = await ctx.params;
    await deleteUser(id);
    return jsonOk({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}
