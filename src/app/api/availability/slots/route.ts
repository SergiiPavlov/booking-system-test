import { requireAuth } from "@/lib/auth/requireAuth";
import { jsonError, jsonOk, validationError } from "@/lib/http/response";
import { AvailabilitySlotsQuerySchema } from "@/lib/validation/availability";
import { getAvailableSlots } from "@/lib/services/availability.service";
import { getUserTimezoneOffsetMin } from "@/lib/services/users.service";

export async function GET(request: Request) {
  try {
    await requireAuth(); // any authenticated user
  } catch (e) {
    return jsonError(e);
  }

  const url = new URL(request.url);
  const raw = {
    businessId: url.searchParams.get("businessId"),
    date: url.searchParams.get("date"),
    durationMin: url.searchParams.get("durationMin") ? Number(url.searchParams.get("durationMin")) : undefined,
    tzOffsetMin: url.searchParams.get("tzOffsetMin") ? Number(url.searchParams.get("tzOffsetMin")) : undefined
  };

  const parsed = AvailabilitySlotsQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return jsonError(validationError(parsed.error.flatten()));
  }

  try {
    // Do NOT trust tzOffsetMin provided by client.
    // Slots/availability should be computed using the business' timezone offset stored on server.
    const businessTzOffsetMin = await getUserTimezoneOffsetMin(parsed.data.businessId);
    const slots = await getAvailableSlots({ ...parsed.data, tzOffsetMin: businessTzOffsetMin });
    return jsonOk({ slots });
  } catch (e) {
    return jsonError(e);
  }
}
