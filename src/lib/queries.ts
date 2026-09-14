import { and, count, desc, eq, gt, max } from 'drizzle-orm';
import { db } from './db';
import { actors, countries, sources, storyActors, storyCountries, stories } from '../../db/schema';

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

export interface CountrySummary {
  code: string;
  name: string;
  lat: number;
  lng: number;
  storyCount: number;
  latestPublishedAt: string | null;
}

/** Powers the map view: one row per country with at least one story in the window. */
export async function getCountriesSummary(hours: number): Promise<CountrySummary[]> {
  const rows = await db
    .select({
      code: countries.code,
      name: countries.name,
      lat: countries.lat,
      lng: countries.lng,
      storyCount: count(storyCountries.storyId),
      latestPublishedAt: max(stories.publishedAt),
    })
    .from(storyCountries)
    .innerJoin(countries, eq(storyCountries.countryCode, countries.code))
    .innerJoin(stories, eq(storyCountries.storyId, stories.id))
    .where(gt(stories.publishedAt, hoursAgo(hours)))
    .groupBy(countries.code, countries.name, countries.lat, countries.lng);

  return rows.map((r) => ({
    code: r.code,
    name: r.name,
    lat: Number(r.lat),
    lng: Number(r.lng),
    storyCount: r.storyCount,
    latestPublishedAt: r.latestPublishedAt ? r.latestPublishedAt.toISOString() : null,
  }));
}

export interface StoryListItem {
  id: string;
  title: string;
  summary: string | null;
  url: string;
  sourceName: string;
  publishedAt: string | null;
}

/** Story list for the country side panel. */
export async function getStories(options: {
  countryCode?: string;
  hours: number;
}): Promise<StoryListItem[]> {
  const conditions = [gt(stories.publishedAt, hoursAgo(options.hours))];

  const query = db
    .select({
      id: stories.id,
      title: stories.title,
      summary: stories.summary,
      url: stories.url,
      sourceName: sources.name,
      publishedAt: stories.publishedAt,
    })
    .from(stories)
    .innerJoin(sources, eq(stories.sourceId, sources.id))
    .$dynamic();

  if (options.countryCode) {
    query.innerJoin(storyCountries, eq(storyCountries.storyId, stories.id));
    conditions.push(eq(storyCountries.countryCode, options.countryCode));
  }

  const rows = await query
    .where(and(...conditions))
    .orderBy(desc(stories.publishedAt))
    .limit(100);

  return rows.map((r) => ({
    ...r,
    publishedAt: r.publishedAt ? r.publishedAt.toISOString() : null,
  }));
}

export interface StoryDetail extends StoryListItem {
  whyItMatters: string | null;
  historicalContext: string | null;
  countries: { code: string; name: string }[];
  actors: { key: string; name: string }[];
}

export async function getStoryById(id: string): Promise<StoryDetail | null> {
  const [story] = await db
    .select({
      id: stories.id,
      title: stories.title,
      summary: stories.summary,
      url: stories.url,
      sourceName: sources.name,
      publishedAt: stories.publishedAt,
      whyItMatters: stories.whyItMatters,
      historicalContext: stories.historicalContext,
    })
    .from(stories)
    .innerJoin(sources, eq(stories.sourceId, sources.id))
    .where(eq(stories.id, id))
    .limit(1);

  if (!story) return null;

  const countryTags = await db
    .select({ code: countries.code, name: countries.name })
    .from(storyCountries)
    .innerJoin(countries, eq(storyCountries.countryCode, countries.code))
    .where(eq(storyCountries.storyId, id));

  const actorTags = await db
    .select({ key: actors.key, name: actors.name })
    .from(storyActors)
    .innerJoin(actors, eq(storyActors.actorKey, actors.key))
    .where(eq(storyActors.storyId, id));

  return {
    ...story,
    publishedAt: story.publishedAt ? story.publishedAt.toISOString() : null,
    countries: countryTags,
    actors: actorTags,
  };
}
