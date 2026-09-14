'use client';

import type { StoryListItem } from '@/lib/queries';

function relativeTime(iso: string | null): string {
  if (!iso) return '';
  const hours = Math.round((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60));
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export interface StoryCardProps {
  story: StoryListItem;
  onSelect: (id: string) => void;
}

export default function StoryCard({ story, onSelect }: StoryCardProps) {
  return (
    <button
      onClick={() => onSelect(story.id)}
      className="w-full text-left p-3 rounded-lg border border-black/10 hover:bg-black/5 transition-colors"
    >
      <p className="font-medium text-sm leading-snug">{story.title}</p>
      <p className="mt-1 text-xs text-black/60">
        {story.sourceName} · {relativeTime(story.publishedAt)}
      </p>
    </button>
  );
}
