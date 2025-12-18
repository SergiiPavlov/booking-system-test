import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { jsonError } from "@/lib/http/response";
import { ApiError } from "@/lib/http/errors";
import {
  getAvailabilityOrDefault,
  upsertAvailability,
  type WeeklyAvailability,
} from "@/lib/services/availability.service";

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth.role !== "BUSINESS") {
      throw new ApiError(403, "FORBIDDEN", "Only BUSINESS can manage availability");
    }

    const availability = await getAvailabilityOrDefault(auth.userId);
    return NextResponse.json({ availability });
  } catch (e: any) {
    return jsonError(e);
  }
}

export async function PUT(req: Request) {
  try {
    const auth = await requireAuth();
    if (auth.role !== "BUSINESS") {
      throw new ApiError(403, "FORBIDDEN", "Only BUSINESS can manage availability");
    }

    const body = (await req.json().catch(() => null)) as Partial<WeeklyAvailability> | null;
    if (!body || typeof body !== "object") {
      throw new ApiError(400, "VALIDATION_ERROR", "Invalid JSON body");
    }

    // Minimal validation: the service will enforce shape + time strings.
    const availability = await upsertAvailability(auth.userId, {
      version: typeof body.version === "number" ? body.version : 1,
      slotStepMin: typeof body.slotStepMin === "number" ? body.slotStepMin : 15,
      days: (body as any).days,
    });

    return NextResponse.json({ availability });
  } catch (e: any) {
    return jsonError(e);
  }
}
