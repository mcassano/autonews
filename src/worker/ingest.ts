import { eq, isNull, and, gt } from 'drizzle-orm';
import { db } from '../lib/db';
import { sources, countries, actors, stories, storyCountries, storyActors } from '../../db/schema';
import { logger } from '../lib/logger';
import { geotag } from '../lib/geotag';
import { findNearDuplicate } from '../lib/dedupe';
import { fetchFeed } from './fetchFeeds';
import { enrichStory } from './enrich';
import { feeds } from './feeds';

const LOOKBACK_HOURS = Number(process.env.INGEST_LOOKBACK_HOURS ?? 48);
const CONCURRENCY = Number(process.env.INGEST_CONCURRENCY ?? 5);

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;

  async function worker() {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function ingestFeed(
  source: typeof sources.$inferSelect,
  countryRows: (typeof countries.$inferSelect)[],
  actorRows: (typeof actors.$inferSelect)[],
) {
  const result = await fetchFeed(
    { id: source.key, url: source.feedUrl },
    { etag: source.etag, lastModified: source.lastModified },
  );

  if (result.notModified) {
    logger.info({ source: source.key }, 'Feed not modified, skipping');
  } else {
    const cutoff = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000);
    const recentItems = result.items.filter(
      (item) => !item.publishedAt || item.publishedAt > cutoff,
    );

    let inserted = 0;
    for (const item of recentItems) {
      try {
        const nearDup = await findNearDuplicate(db, item.title);
        // If the near-duplicate doesn't have a cluster yet, mint one now (its own id)
        // so both rows end up sharing the same cluster_id value.
        const clusterId = nearDup ? (nearDup.clusterId ?? nearDup.id) : undefined;

        const [row] = await db
          .insert(stories)
          .values({
            sourceId: source.id,
            url: item.link,
            title: item.title,
            summary: item.summary,
            publishedAt: item.publishedAt,
            clusterId,
          })
          .onConflictDoNothing({ target: stories.url })
          .returning({ id: stories.id });

        if (!row) continue; // already existed (dedup by URL)
        inserted++;

        if (nearDup && !nearDup.clusterId) {
          await db.update(stories).set({ clusterId }).where(eq(stories.id, nearDup.id));
        }

        const tags = geotag({ title: item.title, summary: item.summary }, countryRows, actorRows);

        if (tags.countries.length > 0) {
          await db
            .insert(storyCountries)
            .values(
              tags.countries.map((c) => ({
                storyId: row.id,
                countryCode: c.code,
                source: c.source,
              })),
            )
            .onConflictDoNothing();
        }
        if (tags.actors.length > 0) {
          await db
            .insert(storyActors)
            .values(
              tags.actors.map((a) => ({ storyId: row.id, actorKey: a.code, source: a.source })),
            )
            .onConflictDoNothing();
        }
      } catch (err) {
        logger.warn(
          { source: source.key, url: item.link, err },
          'Failed to ingest story, skipping it',
        );
      }
    }

    logger.info({ source: source.key, fetched: result.items.length, inserted }, 'Feed ingested');
  }

  await db
    .update(sources)
    .set({
      etag: result.etag ?? source.etag,
      lastModified: result.lastModified ?? source.lastModified,
      lastFetchedAt: new Date(),
    })
    .where(eq(sources.id, source.id));
}

async function enrichPendingStories(
  countryRows: (typeof countries.$inferSelect)[],
  actorRows: (typeof actors.$inferSelect)[],
) {
  const cutoff = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000);
  const pending = await db
    .select()
    .from(stories)
    .where(and(isNull(stories.llmEnrichedAt), gt(stories.fetchedAt, cutoff)));

  if (pending.length === 0) {
    logger.info('No stories pending enrichment');
    return;
  }

  logger.info({ count: pending.length }, 'Enriching pending stories');

  const knownCountries = countryRows.map((c) => ({ id: c.code, name: c.name }));
  const knownActors = actorRows.map((a) => ({ id: a.key, name: a.name }));

  await mapLimit(pending, CONCURRENCY, async (story) => {
    const enrichment = await enrichStory(
      { title: story.title, summary: story.summary, url: story.url },
      knownCountries,
      knownActors,
    );

    if (!enrichment) {
      // Leave llm_enriched_at null so this row is retried on the next run.
      return;
    }

    await db
      .update(stories)
      .set({
        whyItMatters: enrichment.whyItMatters,
        historicalContext: enrichment.historicalContext || null,
        llmEnrichedAt: new Date(),
        llmModelUsed: process.env.LLM_MODEL ?? 'anthropic/claude-haiku-4.5',
      })
      .where(eq(stories.id, story.id));

    if (enrichment.countries.length > 0) {
      await db
        .insert(storyCountries)
        .values(
          enrichment.countries.map((code) => ({
            storyId: story.id,
            countryCode: code,
            source: 'llm' as const,
          })),
        )
        .onConflictDoNothing();
    }
    if (enrichment.actors.length > 0) {
      await db
        .insert(storyActors)
        .values(
          enrichment.actors.map((key) => ({
            storyId: story.id,
            actorKey: key,
            source: 'llm' as const,
          })),
        )
        .onConflictDoNothing();
    }
  });
}

async function main() {
  logger.info('Starting ingestion run');

  const allSourceRows = await db.select().from(sources);
  const countryRows = await db.select().from(countries);
  const actorRows = await db.select().from(actors);

  if (allSourceRows.length === 0) {
    logger.warn('No sources found — run `npm run db:seed` first.');
    return;
  }

  // Only fetch feeds still configured in feeds.ts. A source row can outlive its
  // feed entry (kept for referential integrity with stories already ingested
  // from it) — see the note in feeds.ts about removing dead feeds.
  const activeFeedIds = new Set(feeds.map((f) => f.id));
  const sourceRows = allSourceRows.filter((s) => activeFeedIds.has(s.key));
  const skipped = allSourceRows.length - sourceRows.length;
  if (skipped > 0) {
    logger.info({ skipped }, 'Skipping sources no longer in feeds.ts');
  }

  for (const source of sourceRows) {
    try {
      await ingestFeed(source, countryRows, actorRows);
    } catch (err) {
      logger.error(
        { source: source.key, err },
        'Unhandled error ingesting feed, continuing with next feed',
      );
    }
  }

  await enrichPendingStories(countryRows, actorRows);

  logger.info('Ingestion run complete');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error({ err }, 'Ingestion run failed');
    process.exit(1);
  });
