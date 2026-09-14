# autonews

A self-updating map of global geopolitics news: pulls headlines from free, public RSS
feeds spanning every major region, tags each story with the countries and major powers
involved, and (optionally) uses an LLM to explain why a story matters and its
background — so a US-based reader can understand global events in context, not just
read a headline.

## How it works

One Next.js codebase runs as **two Railway services** sharing one Postgres database:

- **`web`** — the map UI and read-only API routes. Always on.
- **`worker`** — the same codebase, run as a one-shot script (`npm run ingest`) on a
  Railway **cron schedule**. It fetches every configured RSS feed, dedupes, tags
  stories with countries/actors, and (if an LLM key is configured) enriches new
  stories with a "why it matters" blurb, then exits.

```
RSS feeds (src/worker/feeds.ts)
        │
        ▼
  fetchFeeds.ts  ── conditional GET (ETag / Last-Modified)
        │
        ▼
  ingest.ts      ── dedupe by URL, trigram-cluster near-duplicates,
        │            keyword-geotag (lib/geotag.ts) every story
        ▼
  Postgres        (db/schema.ts)
        │
        ▼
  enrich.ts       ── OpenRouter (LLM) + Brave Search grounding,
        │            only for stories not yet enriched
        ▼
  Postgres (why_it_matters / historical_context columns)
        │
        ▼
  API routes (src/app/api/*) ── read-only, power the map + story views
        │
        ▼
  Map UI (src/components/*)
```

Geotagging is intentionally a **hybrid**: a cheap, deterministic keyword/alias match
(`src/lib/geotag.ts`) tags every story for free, and an LLM pass (`src/worker/enrich.ts`)
double-checks/augments that and writes the reader-facing context. The LLM call is
cached via the `llm_enriched_at` column — a story is only ever enriched once.

## Local development

Requires Node 22+ and a Postgres database (local or remote).

```bash
cp .env.example .env      # fill in DATABASE_URL at minimum
npm install
npm run db:migrate        # creates tables + pg_trgm extension
npm run db:seed           # loads countries, actors, and the feed list as sources
npm run ingest             # runs one ingestion pass against real feeds
npm run dev                 # http://localhost:3000
```

`OPEN_ROUTER_API_KEY` and `BRAVE_SEARCH_API_KEY` are optional — without them, stories
still get keyword-based country/actor tags and show up on the map, they just won't have
an LLM-written "why it matters" blurb.

### Scripts

| Script                                                            | Purpose                                                                                      |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `npm run dev`                                                     | Next.js dev server                                                                           |
| `npm run build` / `start`                                         | Production build / server (the `web` service's start command)                                |
| `npm run ingest`                                                  | Runs one ingestion pass (the `worker` service's start command)                               |
| `npm run db:migrate`                                              | Applies Drizzle migrations                                                                   |
| `npm run db:seed`                                                 | (Re)loads `db/seed/countries.ts`, `db/seed/actors.ts`, and `src/worker/feeds.ts` into the DB |
| `npm run db:generate`                                             | Generates a new Drizzle migration after editing `db/schema.ts`                               |
| `npm run lint` / `format` / `format:check` / `typecheck` / `test` | Standard code-quality checks, all run in CI (`.github/workflows/ci.yml`)                     |

## Adding a feed

Add an entry to the `feeds` array in `src/worker/feeds.ts`, then run `npm run db:seed`
to register it as a `sources` row. Verify the URL actually serves RSS/Atom XML first —
outlets rotate feed paths — e.g.:

```bash
curl -sIL "https://example.com/feed.xml"
```

Only store `title` / `summary` / `link` / `pubDate` from a feed — never scrape or store
full article bodies; linking out to the source is both the licensing-safe approach and
the point (this app is context, not a replacement for the article).

## Adding a country or actor

Append to `db/seed/countries.ts` (needs `code`, `name`, `aliases`, `lat`/`lng`) or
`db/seed/actors.ts` (`key`, `name`, `aliases`), then `npm run db:seed`. Keep aliases
unambiguous — see the `GE`/Georgia entry in `countries.ts` for how to avoid a country
name colliding with something else in English text (only matched via "Georgian" /
"Tbilisi", not the bare word, to avoid the US state).

## Deployment (Railway)

This app is deployed as two services in its own Railway project (kept separate from
any other Railway projects on the account):

1. A Postgres plugin, shared by both services via `DATABASE_URL`.
2. A `web` service: start command `npm run start`, standard HTTP service.
3. A `worker` service: start command `npm run ingest`, configured with a **Cron
   Schedule** (e.g. every 45 minutes) instead of running continuously.

Environment variables (see `.env.example`): `DATABASE_URL` (shared), `OPEN_ROUTER_API_KEY`
and `BRAVE_SEARCH_API_KEY` (worker only), `LLM_MODEL`, `INGEST_CONCURRENCY`,
`INGEST_LOOKBACK_HOURS`.
