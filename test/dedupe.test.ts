import { describe, expect, it } from 'vitest';
import { normalizeTitle } from '@/lib/dedupe';

describe('normalizeTitle', () => {
  it('lowercases and strips punctuation', () => {
    expect(normalizeTitle("Russia's Economy Slows, Officials Say")).toBe(
      'russias economy slows officials say',
    );
  });

  it('collapses repeated whitespace', () => {
    expect(normalizeTitle('Too   many    spaces')).toBe('too many spaces');
  });

  it('trims leading and trailing whitespace', () => {
    expect(normalizeTitle('  padded title  ')).toBe('padded title');
  });

  it('produces the same normalized form for near-identical headlines', () => {
    const a = normalizeTitle('Ukraine strikes back: officials confirm');
    const b = normalizeTitle('Ukraine Strikes Back — Officials Confirm');
    expect(a).toBe(b);
  });
});
