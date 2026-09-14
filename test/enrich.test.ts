import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enrichStory } from '@/worker/enrich';

const knownCountries = [
  { id: 'UA', name: 'Ukraine' },
  { id: 'RU', name: 'Russia' },
];
const knownActors = [{ id: 'US', name: 'United States' }];

const story = {
  title: 'Ceasefire talks resume',
  summary: 'Diplomats met today.',
  url: 'https://example.com/a',
};

function mockOpenRouterResponse(content: string, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    json: async () => ({ choices: [{ message: { content } }] }),
  });
}

describe('enrichStory', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.OPEN_ROUTER_API_KEY = 'test-key';
    delete process.env.BRAVE_SEARCH_API_KEY; // skip search grounding in these tests
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('returns null when OPEN_ROUTER_API_KEY is not set', async () => {
    delete process.env.OPEN_ROUTER_API_KEY;
    const result = await enrichStory(story, knownCountries, knownActors);
    expect(result).toBeNull();
  });

  it('parses a valid enrichment response', async () => {
    vi.stubGlobal(
      'fetch',
      mockOpenRouterResponse(
        JSON.stringify({
          countries: ['UA', 'RU'],
          actors: ['US'],
          whyItMatters: 'This matters because of X.',
          historicalContext: 'Some background.',
        }),
      ),
    );

    const result = await enrichStory(story, knownCountries, knownActors);
    expect(result).toEqual({
      countries: ['UA', 'RU'],
      actors: ['US'],
      whyItMatters: 'This matters because of X.',
      historicalContext: 'Some background.',
    });
  });

  it('parses a response wrapped in a markdown code fence', async () => {
    const fenced = [
      '```json',
      JSON.stringify({ countries: ['UA'], actors: [], whyItMatters: 'It matters.' }),
      '```',
    ].join('\n');
    vi.stubGlobal('fetch', mockOpenRouterResponse(fenced));

    const result = await enrichStory(story, knownCountries, knownActors);
    expect(result?.countries).toEqual(['UA']);
    expect(result?.whyItMatters).toBe('It matters.');
  });

  it('filters out country/actor codes not in the known lists', async () => {
    vi.stubGlobal(
      'fetch',
      mockOpenRouterResponse(
        JSON.stringify({
          countries: ['UA', 'XX'],
          actors: ['US', 'YY'],
          whyItMatters: 'Why it matters.',
        }),
      ),
    );

    const result = await enrichStory(story, knownCountries, knownActors);
    expect(result?.countries).toEqual(['UA']);
    expect(result?.actors).toEqual(['US']);
  });

  it('returns null when the HTTP response is not ok', async () => {
    vi.stubGlobal('fetch', mockOpenRouterResponse('', false));
    const result = await enrichStory(story, knownCountries, knownActors);
    expect(result).toBeNull();
  });

  it('returns null when the response content is not valid JSON', async () => {
    vi.stubGlobal('fetch', mockOpenRouterResponse('not json'));
    const result = await enrichStory(story, knownCountries, knownActors);
    expect(result).toBeNull();
  });

  it('returns null when the response fails schema validation', async () => {
    vi.stubGlobal('fetch', mockOpenRouterResponse(JSON.stringify({ countries: ['UA'] })));
    const result = await enrichStory(story, knownCountries, knownActors);
    expect(result).toBeNull();
  });

  it('returns null when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')));
    const result = await enrichStory(story, knownCountries, knownActors);
    expect(result).toBeNull();
  });
});
