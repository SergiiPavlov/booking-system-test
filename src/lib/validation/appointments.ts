import { z } from "zod";

const isoDateTime = z.string().datetime({ offset: true }).or(z.string().datetime());

export const createAppointmentSchema = z.object({
  businessId: z.string().uuid(),
  startAt: isoDateTime,
  durationMin: z.number().int().min(15).max(240),
  // JS Date.getTimezoneOffset() semantics (UTC - local), minutes
  tzOffsetMin: z.number().int().min(-14 * 60).max(14 * 60).optional()
});

export const rescheduleAppointmentSchema = z.object({
  // Contract: reschedule requires both startAt and durationMin.
  // If we ever want true PATCH semantics, we must change the service to
  // read missing fields from the existing appointment.
  startAt: isoDateTime,
  durationMin: z.number().int().min(15).max(240),
  // JS Date.getTimezoneOffset() semantics (UTC - local), minutes
  tzOffsetMin: z.number().int().min(-14 * 60).max(14 * 60).optional()
});
