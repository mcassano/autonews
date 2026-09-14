'use client';

import { useEffect, useState } from 'react';
import type { StoryListItem } from '@/lib/queries';
import StoryCard from './StoryCard';

export interface CountryPanelProps {
  countryCode: string;
  countryName: string;
  onClose: () => void;
  onSelectStory: (id: string) => void;
}

export default function CountryPanel({
  countryCode,
  countryName,
  onClose,
  onSelectStory,
}: CountryPanelProps) {
  const [stories, setStories] = useState<StoryListItem[] | null>(null);

  useEffect(() => {
    fetch(`/api/stories?country=${countryCode}&hours=48`)
      .then((res) => res.json())
      .then((data: { stories: StoryListItem[] }) => setStories(data.stories))
      .catch(() => setStories([]));
  }, [countryCode]);

  return (
    <aside className="absolute top-0 right-0 h-full w-full sm:w-96 bg-white shadow-xl overflow-y-auto z-10">
      <div className="flex items-center justify-between p-4 border-b border-black/10 sticky top-0 bg-white">
        <h2 className="font-semibold">{countryName}</h2>
        <button onClick={onClose} className="text-black/50 hover:text-black" aria-label="Close">
          ✕
        </button>
      </div>
      <div className="p-4 flex flex-col gap-2">
        {stories === null && <p className="text-sm text-black/50">Loading…</p>}
        {stories !== null && stories.length === 0 && (
          <p className="text-sm text-black/50">No recent stories for {countryName}.</p>
        )}
        {stories?.map((story) => (
          <StoryCard key={story.id} story={story} onSelect={onSelectStory} />
        ))}
      </div>
    </aside>
  );
}
