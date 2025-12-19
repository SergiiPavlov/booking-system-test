import { AppointmentStatus, UserRole } from "@prisma/client";
import { ApiError } from "@/lib/http/ApiError";
import { prisma } from "@/lib/db/prisma";
import { isOverlapping } from "./overlap";
import { isWithinAvailability } from "./availability.service";

// Tiny date helpers (avoid extra deps like date-fns for this test assignment).
function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function isBefore(a: Date, b: Date): boolean {
  return a.getTime() < b.getTime();
}

const MAX_DURATION_MIN = 240;

export async function listAppointmentsForUser(user: { id: string; role: UserRole }) {
  if (user.role === UserRole.CLIENT) {
    return prisma.appointment.findMany({
      where: { clientId: user.id },
      orderBy: { startAt: "asc" },
      include: { business: true, client: true }
    });
  }

  return prisma.appointment.findMany({
    where: { businessId: user.id },
    orderBy: { startAt: "asc" },
    include: { client: true, business: true }
  });
}

export async function listMyAppointments(userId: string) {
  return prisma.appointment.findMany({
    where: {
      OR: [{ clientId: userId }, { businessId: userId }]
    },
    include: {
      client: { select: { id: true, name: true, email: true } },
      business: { select: { id: true, name: true, email: true } }
    },
    orderBy: { startAt: "asc" }
  });
}

export async function createAppointment(opts: {
  clientId: string;
  businessId: string;
  startAt: Date;
  durationMin: number;
  tzOffsetMin: number;
}) {
  const { clientId, businessId, startAt, durationMin, tzOffsetMin } = opts;

  if (!startAt || Number.isNaN(startAt.getTime())) {
    throw new ApiError(400, "VALIDATION_ERROR", "startAt is invalid");
  }

  if (isBefore(startAt, new Date())) {
    throw new ApiError(400, "VALIDATION_ERROR", "startAt must be in the future");
  }

  if (!Number.isInteger(durationMin)) {
    throw new ApiError(400, "VALIDATION_ERROR", "durationMin must be an integer");
  }

  if (durationMin < 15) throw new ApiError(400, "VALIDATION_ERROR", "durationMin must be >= 15");
  if (durationMin > MAX_DURATION_MIN)
    throw new ApiError(400, "VALIDATION_ERROR", `durationMin must be <= ${MAX_DURATION_MIN}`);

  const withinAvailability = await isWithinAvailability({
    businessId,
    startAt,
    durationMin,
    tzOffsetMin
  });
  if (!withinAvailability) {
    throw new ApiError(409, "CONFLICT", "Time slot is outside business availability");
  }

  return prisma.$transaction(async (tx) => {
    const candidates = await tx.appointment.findMany({
      where: {
        businessId,
        status: AppointmentStatus.BOOKED,
        // DB prefilter: any candidate that could overlap must start before newEnd
        startAt: {
          lt: addMinutes(startAt, durationMin)
        }
      },
      orderBy: { startAt: "asc" }
    });

    for (const c of candidates) {
      if (isOverlapping(c.startAt, c.durationMin, startAt, durationMin)) {
        throw new ApiError(409, "CONFLICT", "Time slot is already booked");
      }
    }

    return tx.appointment.create({
      data: {
        clientId,
        businessId,
        startAt,
        durationMin,
        status: AppointmentStatus.BOOKED
      }
    });
  });
}

export async function rescheduleAppointment(opts: {
  appointmentId: string;
  user: { id: string; role: UserRole };
  startAt: Date;
  durationMin: number;
  tzOffsetMin?: number;
}) {
  const { appointmentId, user, startAt, durationMin, tzOffsetMin } = opts;

  const appt = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appt) throw new ApiError(404, "NOT_FOUND", "Appointment not found");

  if (user.role !== UserRole.CLIENT || appt.clientId !== user.id) {
    throw new ApiError(403, "FORBIDDEN", "You can reschedule only your own appointments");
  }

  if (appt.status !== AppointmentStatus.BOOKED) {
    throw new ApiError(409, "CONFLICT", "Only BOOKED appointments can be rescheduled");
  }

  if (!startAt || Number.isNaN(startAt.getTime())) {
    throw new ApiError(400, "VALIDATION_ERROR", "startAt is invalid");
  }

  if (!Number.isInteger(durationMin)) {
    throw new ApiError(400, "VALIDATION_ERROR", "durationMin must be an integer");
  }

  if (durationMin < 15) throw new ApiError(400, "VALIDATION_ERROR", "durationMin must be >= 15");
  if (durationMin > MAX_DURATION_MIN)
    throw new ApiError(400, "VALIDATION_ERROR", `durationMin must be <= ${MAX_DURATION_MIN}`);

  const withinAvailability = await isWithinAvailability({
    businessId: appt.businessId,
    startAt,
    durationMin,
    tzOffsetMin
  });
  if (!withinAvailability) {
    throw new ApiError(409, "CONFLICT", "Time slot is outside business availability");
  }

  // conflict check (ignore current appointment)
  const existing = await prisma.appointment.findMany({
    where: {
      businessId: appt.businessId,
      status: AppointmentStatus.BOOKED,
      id: { not: appt.id },
      startAt: { lt: addMinutes(startAt, durationMin) }
    },
    orderBy: { startAt: "asc" }
  });

  for (const e of existing) {
    if (isOverlapping(e.startAt, e.durationMin, startAt, durationMin)) {
      throw new ApiError(409, "CONFLICT", "Time slot is already booked");
    }
  }

  return prisma.appointment.update({
    where: { id: appt.id },
    data: {
      startAt,
      durationMin,
      updatedAt: new Date()
    }
  });
}

export async function cancelAppointment(opts: { appointmentId: string; user: { id: string; role: UserRole } }) {
  const { appointmentId, user } = opts;

  const appt = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appt) throw new ApiError(404, "NOT_FOUND", "Appointment not found");

  if (appt.status !== AppointmentStatus.BOOKED) {
    // idempotent-ish
    return prisma.appointment.update({
      where: { id: appt.id },
      data: { status: AppointmentStatus.CANCELED, updatedAt: new Date() }
    });
  }

  // CLIENT can cancel only own; BUSINESS can cancel only own business
  const allowed =
    (user.role === UserRole.CLIENT && appt.clientId === user.id) ||
    (user.role === UserRole.BUSINESS && appt.businessId === user.id);

  if (!allowed) {
    throw new ApiError(403, "FORBIDDEN", "You can cancel only your own appointments");
  }

  return prisma.appointment.update({
    where: { id: appt.id },
    data: { status: AppointmentStatus.CANCELED, updatedAt: new Date() }
  });
}
