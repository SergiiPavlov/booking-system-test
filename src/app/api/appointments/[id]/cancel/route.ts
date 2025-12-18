import { requireAuth } from "@/lib/auth/requireAuth";
import { jsonError, jsonOk } from "@/lib/http/response";
import { cancelAppointment } from "@/lib/services/appointments.service";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = requireAuth();
    const { id } = await ctx.params;

    const appointment = await cancelAppointment({ appointmentId: id, actorUserId: auth.userId });
    return jsonOk({ appointment });
  } catch (e) {
    return jsonError(e);
  }
}
