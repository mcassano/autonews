'use client';

import { useEffect, useState } from 'react';
import Map from './Map';
import CountryPanel from './CountryPanel';
import StoryDetail from './StoryDetail';
import type { CountrySummary } from '@/lib/queries';

export default function MapView() {
  const [countries, setCountries] = useState<CountrySummary[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<CountrySummary | null>(null);
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/countries-summary?hours=48')
      .then((res) => res.json())
      .then((data: { countries: CountrySummary[] }) => setCountries(data.countries))
      .catch(() => setCountries([]));
  }, []);

  return (
    <div className="relative flex-1">
      <Map
        countries={countries}
        onSelectCountry={(code) => {
          const country = countries.find((c) => c.code === code) ?? null;
          setSelectedCountry(country);
        }}
      />

      {selectedCountry && (
        <CountryPanel
          key={selectedCountry.code}
          countryCode={selectedCountry.code}
          countryName={selectedCountry.name}
          onClose={() => setSelectedCountry(null)}
          onSelectStory={setSelectedStoryId}
        />
      )}

      {selectedStoryId && (
        <StoryDetail
          key={selectedStoryId}
          storyId={selectedStoryId}
          onClose={() => setSelectedStoryId(null)}
        />
      )}
    </div>
  );
}
