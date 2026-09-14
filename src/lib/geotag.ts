interface AliasedEntity {
  aliases: string[];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Case-insensitive whole-word/phrase match: an alias like "china" matches
 * "China's economy" but not "chinaware"; a multi-word alias like "white house"
 * matches as a phrase.
 */
function buildAliasPattern(aliases: string[]): RegExp {
  const escaped = aliases
    .slice()
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp);
  return new RegExp(`\\b(${escaped.join('|')})\\b`, 'i');
}

/** Returns the `id` of every entity whose alias list matches somewhere in `text`. */
export function matchAny<TId extends string, TEntity extends AliasedEntity>(
  text: string,
  entities: readonly (TEntity & { id: TId })[],
): TId[] {
  return entities
    .filter((entity) => buildAliasPattern(entity.aliases).test(text))
    .map((entity) => entity.id);
}

export interface GeotagInput {
  title: string;
  summary?: string | null;
}

export interface GeotagMatch {
  code: string;
  source: 'keyword';
}

/**
 * Keyword/alias-based geotagging: the cheap, deterministic pass that runs on
 * every story (see README.md for the full pipeline). Intentionally simple —
 * false negatives are acceptable, false positives are the main risk,
 * mitigated by requiring whole-word/phrase matches and by curated alias lists
 * that avoid ambiguous bare names (e.g. "Georgia" the country only matches
 * via "Georgian"/"Tbilisi", not the bare word, to avoid the US state).
 */
export function geotag(
  story: GeotagInput,
  countries: readonly { code: string; aliases: string[] }[],
  actors: readonly { key: string; aliases: string[] }[],
): { countries: GeotagMatch[]; actors: GeotagMatch[] } {
  const text = `${story.title} ${story.summary ?? ''}`;

  const countryMatches = matchAny(
    text,
    countries.map((c) => ({ id: c.code, aliases: c.aliases })),
  ).map((code) => ({ code, source: 'keyword' as const }));

  const actorMatches = matchAny(
    text,
    actors.map((a) => ({ id: a.key, aliases: a.aliases })),
  ).map((code) => ({ code, source: 'keyword' as const }));

  return { countries: countryMatches, actors: actorMatches };
}
