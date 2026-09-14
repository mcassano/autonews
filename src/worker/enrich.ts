import { z } from 'zod';
import { logger } from '../lib/logger';

const enrichmentSchema = z.object({
  countries: z.array(z.string()).default([]),
  actors: z.array(z.string()).default([]),
  whyItMatters: z.string(),
  historicalContext: z.string().optional().default(''),
});

export type EnrichmentResult = z.infer<typeof enrichmentSchema>;

export interface EnrichableStory {
  title: string;
  summary?: string | null;
  url: string;
}

export interface KnownEntity {
  id: string;
  name: string;
}

interface BraveSearchResult {
  title: string;
  description: string;
  url: string;
}

async function braveSearch(query: string): Promise<BraveSearchResult[]> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) return [];

  try {
    const res = await fetch(
      `https://api.search.brave.com/res/v1/web/search?count=3&q=${encodeURIComponent(query)}`,
      {
        headers: {
          Accept: 'application/json',
          'X-Subscription-Token': apiKey,
        },
      },
    );

    if (!res.ok) {
      logger.warn({ status: res.status }, 'Brave Search request failed');
      return [];
    }

    const data = (await res.json()) as {
      web?: { results?: { title: string; description: string; url: string }[] };
    };

    return (data.web?.results ?? []).map((r) => ({
      title: r.title,
      description: r.description,
      url: r.url,
    }));
  } catch (err) {
    logger.warn({ err }, 'Brave Search request threw');
    return [];
  }
}

/**
 * Some models wrap JSON responses in a markdown code fence (```json ... ```)
 * even when told not to and even with response_format: json_object set
 * (OpenRouter doesn't enforce this for every underlying model) — strip it
 * before parsing.
 */
function stripMarkdownFence(content: string): string {
  const trimmed = content.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return match ? match[1] : trimmed;
}

function buildPrompt(
  story: EnrichableStory,
  knownCountries: KnownEntity[],
  knownActors: KnownEntity[],
  searchResults: BraveSearchResult[],
): string {
  const countryList = knownCountries.map((c) => `${c.id}=${c.name}`).join(', ');
  const actorList = knownActors.map((a) => `${a.id}=${a.name}`).join(', ');
  const searchContext = searchResults.length
    ? `\n\nRecent related search results for additional grounding:\n${searchResults
        .map((r) => `- ${r.title}: ${r.description}`)
        .join('\n')}`
    : '';

  return `You are a geopolitics analyst helping a US-based general reader understand a news story in context.

Story title: ${story.title}
Story summary: ${story.summary ?? '(no summary provided)'}
Source URL: ${story.url}${searchContext}

Known country codes (use ONLY these, omit if none apply): ${countryList}
Known actor keys (use ONLY these, omit if none apply): ${actorList}

Respond with ONLY a JSON object (no markdown fences, no commentary) matching this shape:
{
  "countries": string[],       // country codes from the list above that this story is about or set in
  "actors": string[],          // actor keys from the list above meaningfully involved (not just mentioned in passing)
  "whyItMatters": string,      // 2-3 sentences: why a US reader should care, written neutrally
  "historicalContext": string  // 1-2 sentences of relevant background, or "" if not applicable
}

Be factual and neutral. Do not editorialize or take a side on contested claims. If the search results conflict with the story, prefer the story's own text and note uncertainty rather than asserting either as fact.`;
}

/**
 * Calls OpenRouter (optionally grounded with Brave Search results) to produce
 * the reader-facing "why it matters" / historical-context blurb, and to
 * double-check/augment the cheap keyword geotagging in src/lib/geotag.ts.
 * Returns null on any failure — callers must treat enrichment as best-effort
 * and keep the story with keyword-only tags rather than failing the run.
 */
export async function enrichStory(
  story: EnrichableStory,
  knownCountries: KnownEntity[],
  knownActors: KnownEntity[],
): Promise<EnrichmentResult | null> {
  const apiKey = process.env.OPEN_ROUTER_API_KEY;
  if (!apiKey) {
    logger.warn('OPEN_ROUTER_API_KEY not set; skipping LLM enrichment');
    return null;
  }

  const searchResults = await braveSearch(story.title);
  const prompt = buildPrompt(story, knownCountries, knownActors, searchResults);
  const model = process.env.LLM_MODEL ?? 'anthropic/claude-haiku-4.5';

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      logger.warn({ status: res.status, url: story.url }, 'OpenRouter request failed');
      return null;
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      logger.warn({ url: story.url }, 'OpenRouter response had no content');
      return null;
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(stripMarkdownFence(content));
    } catch (err) {
      logger.warn({ url: story.url, err }, 'Enrichment response was not valid JSON');
      return null;
    }

    const parsed = enrichmentSchema.safeParse(parsedJson);
    if (!parsed.success) {
      logger.warn(
        { url: story.url, issues: parsed.error.issues },
        'Enrichment response failed validation',
      );
      return null;
    }

    const validCountryIds = new Set(knownCountries.map((c) => c.id));
    const validActorIds = new Set(knownActors.map((a) => a.id));

    return {
      ...parsed.data,
      countries: parsed.data.countries.filter((c) => validCountryIds.has(c)),
      actors: parsed.data.actors.filter((a) => validActorIds.has(a)),
    };
  } catch (err) {
    logger.warn({ err, url: story.url }, 'Enrichment call threw');
    return null;
  }
}
