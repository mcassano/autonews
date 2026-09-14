import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { logger } from '../src/lib/logger';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL must be set to run migrations.');
  }

  const pool = new Pool({ connectionString });
  const db = drizzle(pool);

  // Required by the trigram index on stories.title (see db/schema.ts) used for
  // cross-source near-duplicate detection.
  await pool.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');

  logger.info('Running migrations...');
  await migrate(db, { migrationsFolder: './db/migrations' });
  logger.info('Migrations complete.');

  await pool.end();
}

main().catch((err) => {
  logger.error({ err }, 'Migration failed');
  process.exit(1);
});
