import { NextRequest, NextResponse } from 'next/server';
import { getStoryById } from '@/lib/queries';

export async function GET(_request: NextRequest, ctx: RouteContext<'/api/stories/[id]'>) {
  const { id } = await ctx.params;
  const story = await getStoryById(id);

  if (!story) {
    return NextResponse.json({ error: 'Story not found' }, { status: 404 });
  }

  return NextResponse.json({ story });
}
