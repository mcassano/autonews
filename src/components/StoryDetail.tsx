'use client';

import { useEffect, useState } from 'react';
import type { StoryDetail as StoryDetailType } from '@/lib/queries';

export interface StoryDetailProps {
  storyId: string;
  onClose: () => void;
}

export default function StoryDetail({ storyId, onClose }: StoryDetailProps) {
  const [story, setStory] = useState<StoryDetailType | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/stories/${storyId}`)
      .then((res) => {
        if (!res.ok) throw new Error('not found');
        return res.json();
      })
      .then((data: { story: StoryDetailType }) => setStory(data.story))
      .catch(() => setNotFound(true));
  }, [storyId]);

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-20 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {!story && !notFound && <p className="text-sm text-black/50">Loading…</p>}
        {notFound && <p className="text-sm text-black/50">Story not found.</p>}
        {story && (
          <>
            <h2 className="font-semibold text-lg leading-snug">{story.title}</h2>
            <p className="mt-1 text-xs text-black/60">{story.sourceName}</p>

            {story.summary && <p className="mt-4 text-sm">{story.summary}</p>}

            {story.whyItMatters && (
              <div className="mt-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-black/50">
                  Why it matters
                </h3>
                <p className="mt-1 text-sm">{story.whyItMatters}</p>
              </div>
            )}

            {story.historicalContext && (
              <div className="mt-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-black/50">
                  Background
                </h3>
                <p className="mt-1 text-sm">{story.historicalContext}</p>
              </div>
            )}

            {(story.countries.length > 0 || story.actors.length > 0) && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {story.countries.map((c) => (
                  <span
                    key={c.code}
                    className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700"
                  >
                    {c.name}
                  </span>
                ))}
                {story.actors.map((a) => (
                  <span
                    key={a.key}
                    className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700"
                  >
                    {a.name}
                  </span>
                ))}
              </div>
            )}

            <a
              href={story.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-block text-sm font-medium text-blue-600 hover:underline"
            >
              Read full article at {story.sourceName} ↗
            </a>
          </>
        )}
      </div>
    </div>
  );
}
