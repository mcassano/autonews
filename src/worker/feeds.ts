export interface FeedConfig {
  /** Stable identifier, used as the `sources.key` in the database. */
  id: string;
  name: string;
  url: string;
  region:
    | 'global'
    | 'us'
    | 'europe'
    | 'russia'
    | 'china'
    | 'japan'
    | 'middle-east'
    | 'india'
    | 'africa'
    | 'latin-america'
    | 'se-asia'
    | 'korea';
  /** Set for outlets that are state-run or state-affiliated, so the UI can surface it. */
  biasNote?: string;
}

/**
 * All feeds are checked to be reachable, valid RSS/Atom, and free to syndicate
 * (headline + summary + link) as of 2026-09-14. Outlets rotate feed paths over
 * time — if `npm run ingest` starts logging fetch failures for a feed, re-verify
 * its URL rather than assuming it's a transient outage.
 */
export const feeds: FeedConfig[] = [
  {
    id: 'bbc-world',
    name: 'BBC World',
    url: 'https://feeds.bbci.co.uk/news/world/rss.xml',
    region: 'global',
  },
  {
    id: 'al-jazeera',
    name: 'Al Jazeera',
    url: 'https://www.aljazeera.com/xml/rss/all.xml',
    region: 'global',
  },
  {
    id: 'nyt-world',
    name: 'NYT World',
    url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
    region: 'us',
  },
  { id: 'npr-world', name: 'NPR World', url: 'https://feeds.npr.org/1004/rss.xml', region: 'us' },
  {
    id: 'foreign-policy',
    name: 'Foreign Policy',
    url: 'https://foreignpolicy.com/feed/',
    region: 'us',
  },
  {
    id: 'guardian-world',
    name: 'The Guardian World',
    url: 'https://www.theguardian.com/world/rss',
    region: 'europe',
  },
  {
    id: 'dw-world',
    name: 'Deutsche Welle',
    url: 'https://rss.dw.com/xml/rss-en-world',
    region: 'europe',
  },
  {
    id: 'moscow-times',
    name: 'The Moscow Times',
    url: 'https://www.themoscowtimes.com/rss/news',
    region: 'russia',
  },
  {
    id: 'tass',
    name: 'TASS',
    url: 'https://tass.com/rss/v2.xml',
    region: 'russia',
    biasNote: 'Russian state-owned news agency',
  },
  {
    id: 'scmp',
    name: 'South China Morning Post',
    url: 'https://www.scmp.com/rss/91/feed',
    region: 'china',
  },
  {
    id: 'japan-times',
    name: 'The Japan Times',
    url: 'https://www.japantimes.co.jp/feed/',
    region: 'japan',
  },
  {
    id: 'times-of-israel',
    name: 'The Times of Israel',
    url: 'https://www.timesofisrael.com/feed/',
    region: 'middle-east',
  },
  {
    id: 'the-hindu-intl',
    name: 'The Hindu (International)',
    url: 'https://www.thehindu.com/news/international/feeder/default.rss',
    region: 'india',
  },
  {
    id: 'hindustan-times',
    name: 'Hindustan Times World',
    url: 'https://www.hindustantimes.com/feeds/rss/world-news/rssfeed.xml',
    region: 'india',
  },
  {
    id: 'allafrica',
    name: 'AllAfrica',
    url: 'https://allafrica.com/tools/headlines/rdf/latest/headlines.rdf',
    region: 'africa',
  },
  {
    id: 'mercopress',
    name: 'MercoPress',
    url: 'https://en.mercopress.com/rss/',
    region: 'latin-america',
  },
  {
    id: 'nikkei-asia',
    name: 'Nikkei Asia',
    url: 'https://asia.nikkei.com/rss/feed/nar',
    region: 'se-asia',
  },
  {
    id: 'yonhap',
    name: 'Yonhap News Agency',
    url: 'https://en.yna.co.kr/RSS/news.xml',
    region: 'korea',
  },
];
