import { requireAuth } from "@/lib/auth/requireAuth";
import { forbidden, validationError } from "@/lib/http/errors";
import { jsonError, jsonOk } from "@/lib/http/response";
import { getBusinessAvailability, setBusinessAvailability } from "@/lib/services/availability.service";
import { AvailabilityUpsertSchema } from "@/lib/validation/availability";

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth.role !== "BUSINESS") {
      throw forbidden("Only BUSINESS can manage availability");
    }

    const availability = await getBusinessAvailability(auth.userId);
    return jsonOk({ availability });
  } catch (e) {
    return jsonError(e);
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await requireAuth();
    if (auth.role !== "BUSINESS") {
      throw forbidden("Only BUSINESS can manage availability");
    }

    const body = await request.json().catch(() => null);
    const parsed = AvailabilityUpsertSchema.safeParse(body);
    if (!parsed.success) {
      throw validationError(parsed.error.flatten());
    }

    const availability = await setBusinessAvailability(auth.userId, parsed.data);
    return jsonOk({ availability });
  } catch (e) {
    return jsonError(e);
  }
}
