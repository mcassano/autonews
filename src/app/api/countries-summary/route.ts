import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCountriesSummary } from '@/lib/queries';

const querySchema = z.object({
  hours: z.coerce
    .number()
    .int()
    .positive()
    .max(24 * 30)
    .default(48),
});

export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const summary = await getCountriesSummary(parsed.data.hours);
  return NextResponse.json({ countries: summary });
}
