'use client';

import dynamic from 'next/dynamic';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="p-3 border-b border-black/10 flex items-center gap-2">
        <h1 className="font-semibold">autonews</h1>
        <span className="text-xs text-black/50">Global geopolitics, on a map</span>
      </header>
      <MapView />
    </div>
  );
}
