import { describe, expect, it } from 'vitest';
import { geotag, matchAny } from '@/lib/geotag';

const countries = [
  { code: 'CN', aliases: ['china', 'chinese', 'beijing'] },
  { code: 'GE', aliases: ['georgian', 'tbilisi'] },
  { code: 'US', aliases: ['united states', 'u.s.', 'white house'] },
];

const actors = [{ key: 'US', aliases: ['united states', 'washington'] }];

describe('geotag', () => {
  it('matches a country by its plain name', () => {
    const result = geotag({ title: "China's economy slows", summary: null }, countries, actors);
    expect(result.countries.map((c) => c.code)).toEqual(['CN']);
  });

  it('does not match on partial words', () => {
    const result = geotag(
      { title: 'A new chinaware exhibit opens', summary: null },
      countries,
      actors,
    );
    expect(result.countries).toHaveLength(0);
  });

  it('matches multi-word aliases as a phrase', () => {
    const result = geotag(
      { title: 'White House announces new policy', summary: null },
      countries,
      actors,
    );
    expect(result.countries.map((c) => c.code)).toContain('US');
  });

  it('avoids the Georgia (US state) / Georgia (country) ambiguity via bare-name exclusion', () => {
    const result = geotag(
      { title: 'Georgia peach farmers report record harvest', summary: null },
      countries,
      actors,
    );
    expect(result.countries).toHaveLength(0);
  });

  it('matches the country of Georgia via an unambiguous alias', () => {
    const result = geotag({ title: 'Tbilisi protests continue', summary: null }, countries, actors);
    expect(result.countries.map((c) => c.code)).toEqual(['GE']);
  });

  it('tags both countries and actors independently for the same story', () => {
    const result = geotag(
      { title: 'United States and China hold trade talks', summary: null },
      countries,
      actors,
    );
    expect(result.countries.map((c) => c.code).sort()).toEqual(['CN', 'US']);
    expect(result.actors.map((a) => a.code)).toEqual(['US']);
  });

  it('is case-insensitive', () => {
    const result = geotag({ title: 'BEIJING hosts summit', summary: null }, countries, actors);
    expect(result.countries.map((c) => c.code)).toEqual(['CN']);
  });
});

describe('matchAny', () => {
  it('returns ids of every matching entity', () => {
    const entities = [
      { id: 'a', aliases: ['alpha'] },
      { id: 'b', aliases: ['bravo'] },
    ];
    expect(matchAny('alpha and bravo team up', entities)).toEqual(['a', 'b']);
  });

  it('returns an empty array when nothing matches', () => {
    const entities = [{ id: 'a', aliases: ['alpha'] }];
    expect(matchAny('nothing relevant here', entities)).toEqual([]);
  });
});
