import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http/response";
import { ApiError, validationError } from "@/lib/http/errors";
import { requireAuth } from "@/lib/auth/requireAuth";
import { getAvailableSlots } from "@/lib/services/availability.service";
import { AvailabilitySlotsQuerySchema } from "@/lib/validation/availability";
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
    const raw = {
      businessId: id,
      date: url.searchParams.get("date"),
      durationMin: url.searchParams.get("durationMin") ? Number(url.searchParams.get("durationMin")) : undefined
    };

    const parsed = AvailabilitySlotsQuerySchema.safeParse(raw);
    if (!parsed.success) {
      throw validationError(parsed.error.flatten());
    }

    // Ensure it's actually a BUSINESS user
    const biz = await prisma.user.findFirst({ where: { id, role: "BUSINESS" } });
    if (!biz) throw new ApiError(404, "NOT_FOUND", "Business not found");

    const slots = await getAvailableSlots(parsed.data);

    return NextResponse.json({
      businessId: id,
      date: parsed.data.date,
      durationMin: parsed.data.durationMin,
      slots
    });
  } catch (e: any) {
    return jsonError(e);
  }
}
