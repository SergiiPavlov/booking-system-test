import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { validationError } from "@/lib/http/errors";
import { AvailabilitySlotsQuerySchema } from "@/lib/validation/availability";
import { getAvailableSlots } from "@/lib/services/availability.service";

export async function GET(request: Request) {
  await requireAuth(); // any authenticated user

  const url = new URL(request.url);
  const raw = {
    businessId: url.searchParams.get("businessId"),
    date: url.searchParams.get("date"),
    durationMin: url.searchParams.get("durationMin") ? Number(url.searchParams.get("durationMin")) : undefined,
    tzOffsetMin: url.searchParams.get("tzOffsetMin") ? Number(url.searchParams.get("tzOffsetMin")) : undefined
  };

  const parsed = AvailabilitySlotsQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(validationError(parsed.error.flatten()), { status: 400 });
  }

  try {
    const slots = await getAvailableSlots(parsed.data);
    return NextResponse.json({ slots });
  } catch (e) {
    // Keep error shape consistent with other API routes
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Failed to get slots" } }, { status: 500 });
  }
}
