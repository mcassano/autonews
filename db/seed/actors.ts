export interface ActorSeed {
  /** Short stable key, not necessarily an ISO code (e.g. 'EU', 'NATO', 'UN'). */
  key: string;
  name: string;
  aliases: string[];
}

/**
 * Major powers and international organizations worth calling out as "who's
 * involved" in a story, independent of where the story is geographically
 * located (see story_actors in db/schema.ts). Deliberately a short, curated
 * list for v1 rather than every country — most countries are covered as
 * locations via countries.ts, not as cross-cutting "actors".
 */
export const actors: ActorSeed[] = [
  {
    key: 'US',
    name: 'United States',
    aliases: [
      'united states',
      'u.s.',
      'usa',
      'american',
      'washington',
      'white house',
      'pentagon',
      'state department',
    ],
  },
  {
    key: 'CN',
    name: 'China',
    aliases: ['china', 'chinese', 'beijing', 'ccp', 'communist party of china'],
  },
  { key: 'RU', name: 'Russia', aliases: ['russia', 'russian', 'moscow', 'kremlin', 'putin'] },
  { key: 'EU', name: 'European Union', aliases: ['european union', 'eu', 'brussels'] },
  {
    key: 'GB',
    name: 'United Kingdom',
    aliases: ['united kingdom', 'u.k.', 'britain', 'british', 'downing street', 'whitehall'],
  },
  { key: 'FR', name: 'France', aliases: ['france', 'french', 'elysee'] },
  { key: 'DE', name: 'Germany', aliases: ['germany', 'german', 'berlin'] },
  { key: 'JP', name: 'Japan', aliases: ['japan', 'japanese', 'tokyo'] },
  { key: 'IN', name: 'India', aliases: ['india', 'indian', 'new delhi'] },
  { key: 'NATO', name: 'NATO', aliases: ['nato', 'north atlantic treaty organization'] },
  { key: 'UN', name: 'United Nations', aliases: ['united nations', 'u.n.', 'security council'] },
];
