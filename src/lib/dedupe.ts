import { sql } from 'drizzle-orm';
import type { db as Db } from './db';

const SIMILARITY_THRESHOLD = 0.6;
const DEDUPE_WINDOW_HOURS = 48;

/** Lowercases and strips punctuation so trivial formatting differences don't defeat comparison. */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface NearDuplicate {
  id: string;
  clusterId: string | null;
}

/**
 * Finds the most similar recent story by normalized-title trigram similarity
 * (requires the `pg_trgm` extension, enabled by db/migrate.ts). Used to assign
 * a shared `cluster_id` across sources reporting the same event — see
 * db/schema.ts and the dedupe strategy in the project plan/README.
 */
export async function findNearDuplicate(
  db: typeof Db,
  title: string,
): Promise<NearDuplicate | null> {
  const normalized = normalizeTitle(title);

  const windowInterval = sql.raw(`interval '${DEDUPE_WINDOW_HOURS} hours'`);

  const result = await db.execute<{ id: string; cluster_id: string | null }>(sql`
    SELECT id, cluster_id
    FROM stories
    WHERE published_at > now() - ${windowInterval}
      AND similarity(lower(regexp_replace(title, '[^\\w\\s]', '', 'g')), ${normalized}) > ${SIMILARITY_THRESHOLD}
    ORDER BY similarity(lower(regexp_replace(title, '[^\\w\\s]', '', 'g')), ${normalized}) DESC
    LIMIT 1
  `);

  const row = result.rows[0];
  if (!row) return null;

  return { id: row.id, clusterId: row.cluster_id };
}
