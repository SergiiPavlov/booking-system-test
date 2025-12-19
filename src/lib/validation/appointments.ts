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
  startAt: isoDateTime.optional(),
  durationMin: z.number().int().min(15).max(240).optional(),
  // JS Date.getTimezoneOffset() semantics (UTC - local), minutes
  tzOffsetMin: z.number().int().min(-14 * 60).max(14 * 60).optional()
});
