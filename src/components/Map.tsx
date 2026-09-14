'use client';

import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { CountrySummary } from '@/lib/queries';

const BASEMAP_STYLE = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';

// Next.js/Turbopack doesn't rewrite maplibre-gl's internal `new Worker(new
// URL(...))` call, so the browser requests a worker script that 404s (see
// scripts/bundle-maplibre-worker.mjs for the full explanation). Point at the
// self-hosted bundle instead, before any Map is constructed. Note: tiles
// won't start rendering for a few seconds after that — the browser has to
// parse/compile the ~700KB worker bundle before it can respond.
maplibregl.setWorkerUrl('/maplibre/maplibre-gl-worker.mjs');

function radiusForCount(count: number): number {
  return Math.min(8 + Math.sqrt(count) * 4, 32);
}

function colorForRecency(latestPublishedAt: string | null): string {
  if (!latestPublishedAt) return '#94a3b8'; // slate-400: unknown recency
  const hoursAgo = (Date.now() - new Date(latestPublishedAt).getTime()) / (1000 * 60 * 60);
  if (hoursAgo < 6) return '#dc2626'; // red-600: very fresh
  if (hoursAgo < 24) return '#f97316'; // orange-500
  return '#3b82f6'; // blue-500: older
}

export interface MapProps {
  countries: CountrySummary[];
  onSelectCountry: (code: string) => void;
}

export default function Map({ countries, onSelectCountry }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const onSelectCountryRef = useRef(onSelectCountry);
  const [tilesLoaded, setTilesLoaded] = useState(false);

  useEffect(() => {
    onSelectCountryRef.current = onSelectCountry;
  });

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = new maplibregl.Map({
      container: containerRef.current,
      style: BASEMAP_STYLE,
      center: [10, 20],
      zoom: 1.5,
    });
    mapRef.current.addControl(new maplibregl.NavigationControl(), 'top-right');
    // The basemap's tile worker takes a few real seconds to spin up on first
    // load (see scripts/bundle-maplibre-worker.mjs) — 'idle' fires once the
    // initial tiles are actually painted, so we can show a loading state
    // instead of a plain background that looks broken in the meantime.
    mapRef.current.once('idle', () => setTilesLoaded(true));

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    for (const marker of markersRef.current) marker.remove();
    markersRef.current = [];

    for (const country of countries) {
      const el = document.createElement('div');
      const size = radiusForCount(country.storyCount) * 2;
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.borderRadius = '50%';
      el.style.backgroundColor = colorForRecency(country.latestPublishedAt);
      el.style.opacity = '0.8';
      el.style.border = '1px solid rgba(255,255,255,0.8)';
      el.style.cursor = 'pointer';
      el.title = `${country.name}: ${country.storyCount} stories`;
      el.addEventListener('click', () => onSelectCountryRef.current(country.code));

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([country.lng, country.lat])
        .addTo(map);
      markersRef.current.push(marker);
    }
  }, [countries]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      {!tilesLoaded && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[#f8f4ec]">
          <p className="text-sm text-black/50">Loading map…</p>
        </div>
      )}
    </div>
  );
}
