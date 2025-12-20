import { requireAuth } from "@/lib/auth/requireAuth";
import { jsonError, jsonOk, validationError } from "@/lib/http/response";
import { rescheduleAppointmentSchema } from "@/lib/validation/appointments";
import { rescheduleAppointment } from "@/lib/services/appointments.service";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    const { id } = await ctx.params;

    const body = await req.json();
    const parsed = rescheduleAppointmentSchema.safeParse(body);
    if (!parsed.success) throw validationError(parsed.error.flatten());

    const appointment = await rescheduleAppointment({
      appointmentId: id,
      user: { id: auth.userId, role: auth.role },
      startAt: new Date(parsed.data.startAt),
      durationMin: parsed.data.durationMin,
      tzOffsetMin: parsed.data.tzOffsetMin
    });

    return jsonOk({ appointment });
  } catch (e) {
    return jsonError(e);
  }
}
