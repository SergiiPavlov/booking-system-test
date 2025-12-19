import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { jsonError } from "@/lib/http/response";
import { ApiError } from "@/lib/http/errors";
import { PutAvailabilitySchema } from "@/lib/validation/availability";
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

    const parsed = PutAvailabilitySchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, "VALIDATION_ERROR", "Invalid availability payload", parsed.error.flatten());
    }

    const availability = await upsertAvailability(auth.userId, {
      version: 1,
      slotStepMin: parsed.data.slotStepMin,
      days: parsed.data.days,
    });

    return NextResponse.json({ availability });
  } catch (e: any) {
    return jsonError(e);
  }
}
