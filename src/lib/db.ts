import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../../db/schema';

type Db = NodePgDatabase<typeof schema>;

let instance: Db | undefined;

function getDb(): Db {
  if (!instance) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL must be set.');
    }
    instance = drizzle(new Pool({ connectionString }), { schema });
  }
  return instance;
}

/**
 * Lazily connects on first use rather than at import time, so that modules
 * which import `db` (e.g. API routes) don't crash `next build`'s route data
 * collection in environments without DATABASE_URL set (like CI) — the
 * connection is only required once a request actually runs a query.
 */
export const db: Db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb() as object, prop, receiver);
  },
});
