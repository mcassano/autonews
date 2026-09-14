import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../schema';
import { countries } from './countries';
import { actors } from './actors';
import { feeds } from '../../src/worker/feeds';
import { logger } from '../../src/lib/logger';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL must be set to seed the database.');
  }

  const pool = new Pool({ connectionString });
  const db = drizzle(pool, { schema });

  logger.info({ count: countries.length }, 'Seeding countries');
  for (const country of countries) {
    await db
      .insert(schema.countries)
      .values({
        code: country.code,
        name: country.name,
        aliases: country.aliases,
        lat: country.lat.toString(),
        lng: country.lng.toString(),
      })
      .onConflictDoUpdate({
        target: schema.countries.code,
        set: {
          name: country.name,
          aliases: country.aliases,
          lat: country.lat.toString(),
          lng: country.lng.toString(),
        },
      });
  }

  logger.info({ count: actors.length }, 'Seeding actors');
  for (const actor of actors) {
    await db
      .insert(schema.actors)
      .values({ key: actor.key, name: actor.name, aliases: actor.aliases })
      .onConflictDoUpdate({
        target: schema.actors.key,
        set: { name: actor.name, aliases: actor.aliases },
      });
  }

  logger.info({ count: feeds.length }, 'Seeding sources');
  for (const feed of feeds) {
    await db
      .insert(schema.sources)
      .values({
        key: feed.id,
        name: feed.name,
        feedUrl: feed.url,
        region: feed.region,
        biasNote: feed.biasNote,
      })
      .onConflictDoUpdate({
        target: schema.sources.key,
        set: { name: feed.name, feedUrl: feed.url, region: feed.region, biasNote: feed.biasNote },
      });
  }

  logger.info('Seed complete.');
  await pool.end();
}

main().catch((err) => {
  logger.error({ err }, 'Seed failed');
  process.exit(1);
});
