import Parser from 'rss-parser';
import { logger } from '../lib/logger';

const parser = new Parser({ timeout: 15_000 });

const USER_AGENT = 'autonews/1.0 (+https://github.com/mcassano/autonews)';

export interface RawFeedItem {
  title: string;
  link: string;
  summary: string | null;
  publishedAt: Date | null;
}

export interface FeedFetchResult {
  items: RawFeedItem[];
  notModified: boolean;
  etag: string | null;
  lastModified: string | null;
}

/**
 * Fetches one feed with conditional GET (If-None-Match / If-Modified-Since)
 * so unchanged feeds cost a cheap 304 rather than a full re-parse. Never
 * throws — a dead/broken feed must not abort the rest of the ingestion run;
 * callers get an empty result and a logged warning instead.
 */
export async function fetchFeed(
  feed: { id: string; url: string },
  previous: { etag?: string | null; lastModified?: string | null },
): Promise<FeedFetchResult> {
  const empty: FeedFetchResult = { items: [], notModified: false, etag: null, lastModified: null };

  try {
    const headers: Record<string, string> = { 'User-Agent': USER_AGENT };
    if (previous.etag) headers['If-None-Match'] = previous.etag;
    if (previous.lastModified) headers['If-Modified-Since'] = previous.lastModified;

    const res = await fetch(feed.url, { headers });

    if (res.status === 304) {
      return { ...empty, notModified: true };
    }

    if (!res.ok) {
      logger.warn({ feed: feed.id, status: res.status }, 'Feed fetch returned non-OK status');
      return empty;
    }

    const xml = await res.text();
    const parsed = await parser.parseString(xml);

    const items: RawFeedItem[] = (parsed.items ?? [])
      .filter((item): item is Parser.Item & { title: string; link: string } =>
        Boolean(item.title && item.link),
      )
      .map((item) => ({
        title: item.title,
        link: item.link,
        summary: item.contentSnippet ?? item.summary ?? null,
        publishedAt: item.isoDate
          ? new Date(item.isoDate)
          : item.pubDate
            ? new Date(item.pubDate)
            : null,
      }));

    return {
      items,
      notModified: false,
      etag: res.headers.get('etag'),
      lastModified: res.headers.get('last-modified'),
    };
  } catch (err) {
    logger.warn({ feed: feed.id, err }, 'Feed fetch failed');
    return empty;
  }
}
