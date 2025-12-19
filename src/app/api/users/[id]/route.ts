import { requireAuth } from "@/lib/auth/requireAuth";
import { ApiError, forbidden } from "@/lib/http/errors";
import { jsonError, jsonOk, validationError } from "@/lib/http/response";
import { updateUserSchema } from "@/lib/validation/users";
import { deleteUser, getUserById, updateUser } from "@/lib/services/users.service";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    const { id } = await ctx.params;

    if (auth.role !== "ADMIN" && auth.userId !== id) {
      throw forbidden("You can only view your own profile");
    }
    const user = await getUserById(id);
    if (!user) throw new ApiError(404, "NOT_FOUND", "User not found");
    return jsonOk({ user });
  } catch (e) {
    return jsonError(e);
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    const { id } = await ctx.params;

    if (auth.role !== "ADMIN" && auth.userId !== id) {
      throw forbidden("You can only update your own profile");
    }
    const body = await req.json();
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) throw validationError(parsed.error.flatten());

    const data =
      auth.role === "ADMIN"
        ? parsed.data
        : {
            name: parsed.data.name,
            password: parsed.data.password
          };

    const user = await updateUser(id, data);
    return jsonOk({ user });
  } catch (e) {
    return jsonError(e);
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    const { id } = await ctx.params;

    if (auth.role !== "ADMIN" && auth.userId !== id) {
      throw forbidden("You can only delete your own profile");
    }
    await deleteUser(id);
    return jsonOk({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}
