import { requireAuth } from "@/lib/auth/requireAuth";
import { jsonError, jsonOk } from "@/lib/http/response";
import { listMyAppointments } from "@/lib/services/appointments.service";

export async function GET() {
  try {
    const auth = requireAuth();
    const appointments = await listMyAppointments({ userId: auth.userId, role: auth.role });
    return jsonOk({ appointments });
  } catch (e) {
    return jsonError(e);
  }
}
