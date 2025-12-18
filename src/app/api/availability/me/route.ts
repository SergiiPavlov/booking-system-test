import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/requireAuth';
import { forbidden, validationError } from '@/lib/http/errors';
import {
  getBusinessAvailability,
  setBusinessAvailability
} from '@/lib/services/availability.service';
import { AvailabilityUpsertSchema } from '@/lib/validation/availability';

export async function GET() {
  const { user } = await requireAuth();
  if (user.role !== 'BUSINESS') return forbidden('Only BUSINESS can manage availability');

  const availability = await getBusinessAvailability(user.id);
  return NextResponse.json({ availability });
}

export async function PUT(request: Request) {
  const { user } = await requireAuth();
  if (user.role !== 'BUSINESS') return forbidden('Only BUSINESS can manage availability');

  const body = await request.json().catch(() => null);
  const parsed = AvailabilityUpsertSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error.flatten());
  }

  const availability = await setBusinessAvailability(user.id, parsed.data);
  return NextResponse.json({ availability });
}
