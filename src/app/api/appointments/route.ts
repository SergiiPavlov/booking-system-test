import { requireAuth } from "@/lib/auth/requireAuth";
import { jsonCreated, jsonError, validationError } from "@/lib/http/response";
import { createAppointmentSchema } from "@/lib/validation/appointments";
import { createAppointment } from "@/lib/services/appointments.service";
import { getUserTimezoneOffsetMin } from "@/lib/services/users.service";
import { ApiError } from "@/lib/http/errors";

export async function POST(req: Request) {
  try {
    const auth = await requireAuth();
    if (auth.role !== "CLIENT") throw new ApiError(403, "FORBIDDEN", "Only CLIENT can create appointments");

    const body = await req.json();
    const parsed = createAppointmentSchema.safeParse(body);
    if (!parsed.success) throw validationError(parsed.error.flatten());

    // SECURITY: Do not trust tzOffsetMin from the client.
    // We validate availability using the BUSINESS user's stored timezone offset.
    const businessTzOffsetMin = await getUserTimezoneOffsetMin(parsed.data.businessId);

    const appt = await createAppointment({
      clientId: auth.userId,
      businessId: parsed.data.businessId,
      startAt: new Date(parsed.data.startAt),
      durationMin: parsed.data.durationMin,
      tzOffsetMin: businessTzOffsetMin
    });

    return jsonCreated({ appointment: appt });
  } catch (e) {
    return jsonError(e);
  }
}
