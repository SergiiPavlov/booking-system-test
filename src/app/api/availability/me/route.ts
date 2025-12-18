import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/requireAuth";
import { forbidden, validationError } from "@/lib/http/errors";
import {
  getBusinessAvailability,
  setBusinessAvailability
} from "@/lib/services/availability.service";
import { AvailabilityUpsertSchema } from "@/lib/validation/availability";

export async function GET() {
  const auth = await requireAuth();
  if (auth.role !== "BUSINESS") {
    return NextResponse.json(forbidden("Only BUSINESS can manage availability"), { status: 403 });
  }

  const availability = await getBusinessAvailability(auth.userId);
  return NextResponse.json({ availability });
}

export async function PUT(request: Request) {
  const auth = await requireAuth();
  if (auth.role !== "BUSINESS") {
    return NextResponse.json(forbidden("Only BUSINESS can manage availability"), { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = AvailabilityUpsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(validationError(parsed.error.flatten()), { status: 400 });
  }

  const availability = await setBusinessAvailability(auth.userId, parsed.data);
  return NextResponse.json({ availability });
}
