import { z } from 'zod';

// Day of week as in JS Date.getUTCDay(): 0=Sun ... 6=Sat
export const DayOfWeekSchema = z.number().int().min(0).max(6);

export const TimeHHMMSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Invalid time (expected HH:MM)');

export const BreakSchema = z.object({
  start: TimeHHMMSchema,
  end: TimeHHMMSchema
});

export const AvailabilityDaySchema = z.object({
  dayOfWeek: DayOfWeekSchema,
  enabled: z.boolean(),
  start: TimeHHMMSchema.optional(),
  end: TimeHHMMSchema.optional(),
  breaks: z.array(BreakSchema).optional()
});

export const PutAvailabilitySchema = z.object({
  slotStepMin: z.number().int().min(5).max(120).default(15),
  days: z.array(AvailabilityDaySchema).min(1)
});

export const GetSlotsQuerySchema = z.object({
  businessId: z.string().uuid(),
  from: z.string().datetime(),
  to: z.string().datetime(),
  durationMin: z.coerce.number().int().min(15).max(24 * 60),
  // optional step override for client requests; server will clamp to sane values
  slotStepMin: z.coerce.number().int().min(5).max(120).optional()
});
