import { prisma } from '@/lib/db/prisma';

export type WeeklyAvailability = {
  slotStepMin: number;
  days: Array<{
    dayOfWeek: number;
    enabled: boolean;
    start?: string;
    end?: string;
    breaks?: Array<{ start: string; end: string }>;
  }>;
  version?: number;
};

export type AvailabilityBreak = { startMin: number; endMin: number };
export type AvailabilityDay = {
  dayOfWeek: number; // 0..6 (UTC)
  startMin: number;
  endMin: number;
  breaks: AvailabilityBreak[];
};

export type AvailabilityState = {
  slotStepMin: number;
  days: AvailabilityDay[];
};

function hhmmToMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map((x) => Number(x));
  return h * 60 + m;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && aEnd > bStart;
}

export async function getAvailabilityForBusiness(businessId: string): Promise<AvailabilityState> {
  const [workingHours, breaks] = await Promise.all([
    prisma.businessWorkingHour.findMany({
      where: { businessId },
      orderBy: { dayOfWeek: 'asc' }
    }),
    prisma.businessBreak.findMany({
      where: { businessId },
      orderBy: [{ dayOfWeek: 'asc' }, { startMin: 'asc' }]
    })
  ]);

  const breaksByDay = new Map<number, AvailabilityBreak[]>();
  for (const b of breaks) {
    const list = breaksByDay.get(b.dayOfWeek) ?? [];
    list.push({ startMin: b.startMin, endMin: b.endMin });
    breaksByDay.set(b.dayOfWeek, list);
  }

  const days: AvailabilityDay[] = workingHours.map((wh) => ({
    dayOfWeek: wh.dayOfWeek,
    startMin: wh.startMin,
    endMin: wh.endMin,
    breaks: breaksByDay.get(wh.dayOfWeek) ?? []
  }));

  // Slot step is currently not persisted (kept simple on purpose).
  // UI can pass a preferred value; server clamps it.
  return { slotStepMin: 15, days };
}

export async function setAvailabilityForBusiness(
  businessId: string,
  input: WeeklyAvailability
): Promise<AvailabilityState> {
  const enabledDays = input.days.filter((d) => d.enabled);

  const normalized = enabledDays.map((d) => {
    if (!d.start || !d.end) {
      throw new Error(`Missing start/end for enabled day ${d.dayOfWeek}`);
    }
    const startMin = hhmmToMin(d.start);
    const endMin = hhmmToMin(d.end);
    if (endMin <= startMin) {
      throw new Error(`End must be after start for day ${d.dayOfWeek}`);
    }

    const breaks = (d.breaks ?? [])
      .map((b) => ({ startMin: hhmmToMin(b.start), endMin: hhmmToMin(b.end) }))
      .filter((b) => b.endMin > b.startMin);

    // Filter breaks outside working interval; we do not hard error to keep UX forgiving.
    const safeBreaks = breaks.filter((b) => overlaps(b.startMin, b.endMin, startMin, endMin));

    return {
      dayOfWeek: d.dayOfWeek,
      startMin,
      endMin,
      breaks: safeBreaks
    };
  });

  const slotStepMin = clamp(input.slotStepMin ?? 15, 5, 120);

  await prisma.$transaction(async (tx) => {
    // Remove disabled days
    const enabledDow = normalized.map((d) => d.dayOfWeek);
    await tx.businessWorkingHour.deleteMany({
      where: {
        businessId,
        ...(enabledDow.length ? { NOT: { dayOfWeek: { in: enabledDow } } } : {})
      }
    });

    // Upsert enabled working hours
    for (const d of normalized) {
      await tx.businessWorkingHour.upsert({
        where: { businessId_dayOfWeek: { businessId, dayOfWeek: d.dayOfWeek } },
        create: {
          id: crypto.randomUUID(),
          businessId,
          dayOfWeek: d.dayOfWeek,
          startMin: d.startMin,
          endMin: d.endMin
        },
        update: {
          startMin: d.startMin,
          endMin: d.endMin
        }
      });
    }

    // Replace breaks (simple + deterministic)
    await tx.businessBreak.deleteMany({ where: { businessId } });
    const breakRows = normalized.flatMap((d) =>
      d.breaks.map((b) => ({
        id: crypto.randomUUID(),
        businessId,
        dayOfWeek: d.dayOfWeek,
        startMin: b.startMin,
        endMin: b.endMin
      }))
    );
    if (breakRows.length) {
      await tx.businessBreak.createMany({ data: breakRows });
    }
  });

  const state = await getAvailabilityForBusiness(businessId);
  return { ...state, slotStepMin };
}

export async function ensureWithinAvailabilityOrThrow(args: {
  businessId: string;
  startAt: Date;
  durationMin: number;
}): Promise<void> {
  const { businessId, startAt, durationMin } = args;

  const dayOfWeek = startAt.getUTCDay();
  const minutes = startAt.getUTCHours() * 60 + startAt.getUTCMinutes();
  const endMinutes = minutes + durationMin;

  const wh = await prisma.businessWorkingHour.findUnique({
    where: { businessId_dayOfWeek: { businessId, dayOfWeek } }
  });
  if (!wh) {
    throw new Error('Outside availability');
  }

  if (minutes < wh.startMin || endMinutes > wh.endMin) {
    throw new Error('Outside availability');
  }

  const breaks = await prisma.businessBreak.findMany({
    where: { businessId, dayOfWeek }
  });

  for (const b of breaks) {
    if (overlaps(minutes, endMinutes, b.startMin, b.endMin)) {
      throw new Error('Outside availability');
    }
  }
}

type FreeSlotsRange =
  | {
      businessId: string;
      from: Date | string;
      to: Date | string;
      durationMin: number;
      slotStepMin?: number;
    }
  | {
      businessId: string;
      date: string;
      durationMin: number;
      slotStepMin?: number;
    };

export async function getFreeSlots(args: FreeSlotsRange): Promise<string[]> {
  const { businessId, durationMin } = args;
  const slotStepMin = clamp(args.slotStepMin ?? 15, 5, 120);

  const from = "date" in args ? new Date(`${args.date}T00:00:00.000Z`) : new Date(args.from);
  const to =
    "date" in args
      ? new Date(from.getTime() + 24 * 60 * 60 * 1000)
      : new Date((args as { to: Date | string }).to);

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from) return [];

  const [workingHours, breaks, booked] = await Promise.all([
    prisma.businessWorkingHour.findMany({ where: { businessId } }),
    prisma.businessBreak.findMany({ where: { businessId } }),
    prisma.appointment.findMany({
      where: {
        businessId,
        status: 'BOOKED',
        startAt: {
          // expanded range to simplify overlap filtering
          gte: new Date(from.getTime() - 24 * 60 * 60 * 1000),
          lt: new Date(to.getTime() + 24 * 60 * 60 * 1000)
        }
      },
      select: { startAt: true, durationMin: true }
    })
  ]);

  const whByDay = new Map<number, { startMin: number; endMin: number }>();
  for (const wh of workingHours) {
    whByDay.set(wh.dayOfWeek, { startMin: wh.startMin, endMin: wh.endMin });
  }

  const breaksByDay = new Map<number, AvailabilityBreak[]>();
  for (const b of breaks) {
    const list = breaksByDay.get(b.dayOfWeek) ?? [];
    list.push({ startMin: b.startMin, endMin: b.endMin });
    breaksByDay.set(b.dayOfWeek, list);
  }

  const bookedRanges = booked.map((a) => {
    const s = a.startAt.getTime();
    const e = s + a.durationMin * 60 * 1000;
    return { s, e };
  });

  const slots: string[] = [];

  // iterate day by day (UTC)
  const dayCursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate(), 0, 0, 0, 0));
  const endDay = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate(), 0, 0, 0, 0));

  while (dayCursor <= endDay) {
    const dayOfWeek = dayCursor.getUTCDay();
    const wh = whByDay.get(dayOfWeek);
    if (wh) {
      const dayBreaks = breaksByDay.get(dayOfWeek) ?? [];

      for (
        let t = wh.startMin;
        t + durationMin <= wh.endMin;
        t += slotStepMin
      ) {
        const tEnd = t + durationMin;

        // must be within [from, to)
        const startAt = new Date(dayCursor.getTime() + t * 60 * 1000);
        const endAt = new Date(dayCursor.getTime() + tEnd * 60 * 1000);
        if (startAt < from || startAt >= to) continue;

        // skip breaks
        let inBreak = false;
        for (const b of dayBreaks) {
          if (overlaps(t, tEnd, b.startMin, b.endMin)) {
            inBreak = true;
            break;
          }
        }
        if (inBreak) continue;

        // skip overlaps with booked
        const sMs = startAt.getTime();
        const eMs = endAt.getTime();
        let hasConflict = false;
        for (const br of bookedRanges) {
          if (sMs < br.e && eMs > br.s) {
            hasConflict = true;
            break;
          }
        }
        if (hasConflict) continue;

        slots.push(startAt.toISOString());
      }
    }

    dayCursor.setUTCDate(dayCursor.getUTCDate() + 1);
  }

  return slots;
}

export async function isWithinAvailability(opts: {
  businessId: string;
  startAt: Date;
  durationMin: number;
}): Promise<boolean> {
  const state = await getBusinessAvailability(opts.businessId);
  // Backward compatibility: if business never configured schedule, don't block booking.
  if (state.days.length === 0) return true;

  const dayOfWeek = opts.startAt.getUTCDay();
  const day = state.days.find((d) => d.dayOfWeek === dayOfWeek);
  if (!day) return false;

  const dayStart = new Date(opts.startAt);
  dayStart.setUTCHours(0, 0, 0, 0);
  const startMin = Math.floor((opts.startAt.getTime() - dayStart.getTime()) / 60000);
  const endMin = startMin + opts.durationMin;

  if (startMin < day.startMin || endMin > day.endMin) return false;

  for (const br of day.breaks) {
    const overlaps = startMin < br.endMin && endMin > br.startMin;
    if (overlaps) return false;
  }

  return true;
}

export const getBusinessAvailability = getAvailabilityForBusiness;
export const setBusinessAvailability = setAvailabilityForBusiness;

export const getAvailabilityOrDefault = getAvailabilityForBusiness;
export const upsertAvailability = setAvailabilityForBusiness;

export const getAvailableSlots = getFreeSlots;
