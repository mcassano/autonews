import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getStories } from '@/lib/queries';

const querySchema = z.object({
  country: z.string().length(2).optional(),
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

  const list = await getStories({
    countryCode: parsed.data.country?.toUpperCase(),
    hours: parsed.data.hours,
  });
  return NextResponse.json({ stories: list });
}
