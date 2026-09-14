import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  numeric,
  uuid,
  primaryKey,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const sources = pgTable('sources', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),
  name: text('name').notNull(),
  feedUrl: text('feed_url').notNull(),
  region: text('region').notNull(),
  biasNote: text('bias_note'),
  etag: text('etag'),
  lastModified: text('last_modified'),
  lastFetchedAt: timestamp('last_fetched_at', { withTimezone: true }),
});

export const countries = pgTable('countries', {
  code: text('code').primaryKey(),
  name: text('name').notNull(),
  aliases: text('aliases')
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  lat: numeric('lat', { precision: 8, scale: 5 }).notNull(),
  lng: numeric('lng', { precision: 8, scale: 5 }).notNull(),
});

export const actors = pgTable('actors', {
  key: text('key').primaryKey(),
  name: text('name').notNull(),
  aliases: text('aliases')
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
});

export const stories = pgTable(
  'stories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sourceId: integer('source_id')
      .notNull()
      .references(() => sources.id),
    url: text('url').notNull().unique(),
    title: text('title').notNull(),
    summary: text('summary'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow(),
    clusterId: uuid('cluster_id'),
    whyItMatters: text('why_it_matters'),
    historicalContext: text('historical_context'),
    llmEnrichedAt: timestamp('llm_enriched_at', { withTimezone: true }),
    llmModelUsed: text('llm_model_used'),
  },
  (table) => [
    index('stories_published_at_idx').on(table.publishedAt.desc()),
    index('stories_title_trgm_idx').using('gin', sql`${table.title} gin_trgm_ops`),
  ],
);

export const storyCountries = pgTable(
  'story_countries',
  {
    storyId: uuid('story_id')
      .notNull()
      .references(() => stories.id, { onDelete: 'cascade' }),
    countryCode: text('country_code')
      .notNull()
      .references(() => countries.code),
    source: text('source').notNull(), // 'keyword' | 'llm'
  },
  (table) => [
    primaryKey({ columns: [table.storyId, table.countryCode] }),
    index('story_countries_country_code_idx').on(table.countryCode),
  ],
);

export const storyActors = pgTable(
  'story_actors',
  {
    storyId: uuid('story_id')
      .notNull()
      .references(() => stories.id, { onDelete: 'cascade' }),
    actorKey: text('actor_key')
      .notNull()
      .references(() => actors.key),
    source: text('source').notNull(), // 'keyword' | 'llm'
  },
  (table) => [primaryKey({ columns: [table.storyId, table.actorKey] })],
);

export type Source = typeof sources.$inferSelect;
export type NewSource = typeof sources.$inferInsert;
export type Country = typeof countries.$inferSelect;
export type Actor = typeof actors.$inferSelect;
export type Story = typeof stories.$inferSelect;
export type NewStory = typeof stories.$inferInsert;
export type StoryCountry = typeof storyCountries.$inferSelect;
export type StoryActor = typeof storyActors.$inferSelect;
