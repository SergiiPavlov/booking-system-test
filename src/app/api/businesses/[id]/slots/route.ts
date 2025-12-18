import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http/response";
import { ApiError } from "@/lib/http/errors";
import { requireAuth } from "@/lib/auth/requireAuth";
import { getAvailableSlots } from "@/lib/services/availability.service";
import { prisma } from "@/lib/db/prisma";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    // Require auth so we don't leak business scheduling data publicly.
    await requireAuth();

    const { id } = await ctx.params;
    if (!id) throw new ApiError(400, "VALIDATION_ERROR", "Missing business id");

    const url = new URL(_req.url);
    const date = url.searchParams.get("date");
    const durationMinRaw = url.searchParams.get("durationMin");
    const durationMin = durationMinRaw ? Number(durationMinRaw) : NaN;

    if (!date) throw new ApiError(400, "VALIDATION_ERROR", "Missing date");
    if (!Number.isFinite(durationMin) || durationMin <= 0) {
      throw new ApiError(400, "VALIDATION_ERROR", "Invalid durationMin");
    }

    // Ensure it's actually a BUSINESS user
    const biz = await prisma.user.findFirst({ where: { id, role: "BUSINESS" } });
    if (!biz) throw new ApiError(404, "NOT_FOUND", "Business not found");

    const slots = await getAvailableSlots(id, date, durationMin);

    return NextResponse.json({ businessId: id, date, durationMin, slots });
  } catch (e: any) {
    return jsonError(e);
  }
}
