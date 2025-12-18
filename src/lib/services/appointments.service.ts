import { prisma } from "@/lib/db/prisma";
import { ApiError } from "@/lib/http/errors";
import { AppointmentStatus, UserRole } from "@prisma/client";
import { isOverlapping } from "./overlap";

const MAX_DURATION_MIN = 240;

function toDate(input: string): Date {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) throw new ApiError(400, "VALIDATION_ERROR", "Invalid startAt");
  return d;
}

function addMinutes(d: Date, min: number): Date {
  return new Date(d.getTime() + min * 60_000);
}

export async function createAppointment(input: {
  clientId: string;
  businessId: string;
  startAt: string;
  durationMin: number;
}) {
  const startAt = toDate(input.startAt);
  if (startAt.getTime() < Date.now()) throw new ApiError(400, "VALIDATION_ERROR", "startAt must be in the future");

  const business = await prisma.user.findUnique({ where: { id: input.businessId }, select: { id: true, role: true } });
  if (!business || business.role !== UserRole.BUSINESS)
    throw new ApiError(400, "VALIDATION_ERROR", "businessId must be a BUSINESS user");

  const newEnd = addMinutes(startAt, input.durationMin);
  const windowStart = addMinutes(startAt, -MAX_DURATION_MIN);
  const windowEnd = addMinutes(newEnd, MAX_DURATION_MIN);

  // Transaction to reduce race window
  return prisma.$transaction(async (tx) => {
    const candidates = await tx.appointment.findMany({
      where: {
        businessId: input.businessId,
        status: AppointmentStatus.BOOKED,
        startAt: { gte: windowStart, lte: windowEnd }
      },
      select: { id: true, startAt: true, durationMin: true }
    });

    const conflict = candidates.some((a) => isOverlapping(a.startAt, a.durationMin, startAt, input.durationMin));
    if (conflict) throw new ApiError(409, "CONFLICT", "Time slot is already booked");

    const appt = await tx.appointment.create({
      data: {
        clientId: input.clientId,
        businessId: input.businessId,
        startAt,
        durationMin: input.durationMin,
        status: AppointmentStatus.BOOKED
      },
      select: {
        id: true,
        clientId: true,
        businessId: true,
        startAt: true,
        durationMin: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return appt;
  });
}

export async function listMyAppointments(input: { userId: string; role: "CLIENT" | "BUSINESS" }) {
  const where = input.role === "BUSINESS" ? { businessId: input.userId } : { clientId: input.userId };

  return prisma.appointment.findMany({
    where,
    orderBy: { startAt: "asc" },
    select: {
      id: true,
      clientId: true,
      businessId: true,
      startAt: true,
      durationMin: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      client: { select: { id: true, name: true, email: true } },
      business: { select: { id: true, name: true, email: true } }
    }
  });
}

export async function rescheduleAppointment(input: {
  appointmentId: string;
  actorUserId: string;
  actorRole: "CLIENT" | "BUSINESS";
  startAt?: string;
  durationMin?: number;
}) {
  const existing = await prisma.appointment.findUnique({
    where: { id: input.appointmentId },
    select: { id: true, clientId: true, businessId: true, startAt: true, durationMin: true, status: true }
  });
  if (!existing) throw new ApiError(404, "NOT_FOUND", "Appointment not found");
  if (existing.status !== AppointmentStatus.BOOKED)
    throw new ApiError(409, "CONFLICT", "Only BOOKED appointments can be rescheduled");

  // Only owner client can reschedule in this simplified spec
  if (existing.clientId !== input.actorUserId)
    throw new ApiError(403, "FORBIDDEN", "You can reschedule only your own appointments");

  const newStart = input.startAt ? toDate(input.startAt) : existing.startAt;
  const newDuration = input.durationMin ?? existing.durationMin;

  if (newStart.getTime() < Date.now()) throw new ApiError(400, "VALIDATION_ERROR", "startAt must be in the future");

  const newEnd = addMinutes(newStart, newDuration);
  const windowStart = addMinutes(newStart, -MAX_DURATION_MIN);
  const windowEnd = addMinutes(newEnd, MAX_DURATION_MIN);

  return prisma.$transaction(async (tx) => {
    const candidates = await tx.appointment.findMany({
      where: {
        businessId: existing.businessId,
        status: AppointmentStatus.BOOKED,
        id: { not: existing.id },
        startAt: { gte: windowStart, lte: windowEnd }
      },
      select: { id: true, startAt: true, durationMin: true }
    });

    const conflict = candidates.some((a) => isOverlapping(a.startAt, a.durationMin, newStart, newDuration));
    if (conflict) throw new ApiError(409, "CONFLICT", "Time slot is already booked");

    return tx.appointment.update({
      where: { id: existing.id },
      data: { startAt: newStart, durationMin: newDuration },
      select: { id: true, clientId: true, businessId: true, startAt: true, durationMin: true, status: true, updatedAt: true }
    });
  });
}

export async function cancelAppointment(input: {
  appointmentId: string;
  actorUserId: string;
  actorRole: "CLIENT" | "BUSINESS";
}) {
  const existing = await prisma.appointment.findUnique({
    where: { id: input.appointmentId },
    select: { id: true, clientId: true, businessId: true, status: true }
  });
  if (!existing) throw new ApiError(404, "NOT_FOUND", "Appointment not found");

  const isOwnerClient = existing.clientId === input.actorUserId;
  const isOwnerBusiness = existing.businessId === input.actorUserId;

  // Both sides can cancel, but only for their own appointments
  if (input.actorRole === "CLIENT") {
    if (!isOwnerClient) throw new ApiError(403, "FORBIDDEN", "You can cancel only your own appointments");
  } else {
    if (!isOwnerBusiness) throw new ApiError(403, "FORBIDDEN", "You can cancel only your own appointments");
  }

  if (existing.status !== AppointmentStatus.BOOKED) {
    return existing;
  }

  return prisma.appointment.update({
    where: { id: existing.id },
    data: { status: AppointmentStatus.CANCELED },
    select: { id: true, clientId: true, businessId: true, status: true, updatedAt: true }
  });
}
