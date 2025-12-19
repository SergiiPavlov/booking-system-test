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
  // Accept only strict HH:MM (00:00..23:59) to avoid NaN downstream.
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm);
  if (!m) throw new Error(`Invalid time (expected HH:MM): ${hhmm}`);
  const h = Number(m[1]);
  const mm = Number(m[2]);
  return h * 60 + mm;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

// Timezone helpers
// `tzOffsetMin` uses JS `Date.getTimezoneOffset()` semantics: minutes = UTC - local.
function toLocal(utc: Date, tzOffsetMin: number): Date {
  return new Date(utc.getTime() - tzOffsetMin * 60 * 1000);
}

function getLocalDayOfWeek(utc: Date, tzOffsetMin: number): number {
  return toLocal(utc, tzOffsetMin).getUTCDay();
}

function getLocalMinuteOfDay(utc: Date, tzOffsetMin: number): number {
  const local = toLocal(utc, tzOffsetMin);
  return local.getUTCHours() * 60 + local.getUTCMinutes();
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
      tzOffsetMin?: number;
    }
  | {
      businessId: string;
      date: string;
      durationMin: number;
      slotStepMin?: number;
      tzOffsetMin?: number;
    };

export async function getFreeSlots(args: FreeSlotsRange): Promise<string[]> {
  const { businessId, durationMin } = args;
  const slotStepMin = clamp(args.slotStepMin ?? 15, 5, 120);

  // Timezone offset uses JS `Date.getTimezoneOffset()` semantics: minutes = UTC - local.
  // We rely on the client-provided offset; if missing, we assume UTC.
  const tzOffsetMin = clamp(
    Math.trunc(
      typeof args.tzOffsetMin === "number" && Number.isFinite(args.tzOffsetMin) ? args.tzOffsetMin : 0
    ),
    -840,
    840
  );

  // When the client passes a plain YYYY-MM-DD (from <input type="date">),
  // interpret it as *local date* for that client, not UTC.
  // Date.getTimezoneOffset() equals (UTC - local) in minutes.
  const from =
    "date" in args
      ? (() => {
          const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(args.date);
          if (!m) return new Date("invalid");
          const y = Number(m[1]);
          const mo = Number(m[2]) - 1;
          const d = Number(m[3]);
          const utcMidnight = Date.UTC(y, mo, d, 0, 0, 0, 0);
          return new Date(utcMidnight + tzOffsetMin * 60_000);
        })()
      : new Date(args.from);
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

  // Iterate local days; availability times are stored as local minutes.
  const dayCursor = new Date(from.getTime());
  const endDay = new Date(to.getTime());

  while (dayCursor < endDay) {
    const dayOfWeek = getLocalDayOfWeek(dayCursor, tzOffsetMin);
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

  const nowMs = Date.now();
  // 1 minute grace for clock skew
  return slots.filter((iso) => {
    const ms = Date.parse(iso);
    return Number.isFinite(ms) && ms > nowMs + 60_000;
  });
}

export async function isWithinAvailability(opts: {
  businessId: string;
  startAt: Date;
  durationMin: number;
  tzOffsetMin?: number;
}): Promise<boolean> {
  const state = await getBusinessAvailability(opts.businessId);
  // Backward compatibility: if business never configured schedule, don't block booking.
  if (state.days.length === 0) return true;

  const tzOffsetMin = clamp(Math.trunc(opts.tzOffsetMin ?? 0), -840, 840);
  const localStartAt = toLocal(opts.startAt, tzOffsetMin);
  const dayOfWeek = localStartAt.getUTCDay();
  const day = state.days.find((d) => d.dayOfWeek === dayOfWeek);
  if (!day) return false;

  const startMin = localStartAt.getUTCHours() * 60 + localStartAt.getUTCMinutes();
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
