import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/requireAuth';
import { validationError } from '@/lib/http/errors';
import { AvailabilitySlotsQuerySchema } from '@/lib/validation/availability';
import { getFreeSlots } from '@/lib/services/availability.service';

export async function GET(request: Request) {
  await requireAuth(); // any authenticated user

  const url = new URL(request.url);
  const raw = {
    businessId: url.searchParams.get('businessId'),
    from: url.searchParams.get('from'),
    to: url.searchParams.get('to'),
    durationMin: url.searchParams.get('durationMin')
      ? Number(url.searchParams.get('durationMin'))
      : undefined
  };

  const parsed = AvailabilitySlotsQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return validationError(parsed.error.flatten());
  }

  const slots = await getFreeSlots(parsed.data);
  return NextResponse.json({ slots });
}
