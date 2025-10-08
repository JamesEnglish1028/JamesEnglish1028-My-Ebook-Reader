import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fetchOpds2Feed, setCachedEtag, getCachedEtag } from '../opds2';

describe('fetchOpds2Feed', () => {
  const url = 'https://example.org/catalog.json';
  let originalFetch: any;

  beforeEach(() => {
    originalFetch = (globalThis as any).fetch;
    // Clear any previous cached etag for deterministic tests
    try { localStorage.removeItem('mebooks.opds.etag.' + encodeURIComponent(url)); } catch {}
  });

  afterEach(() => {
    (globalThis as any).fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('sends If-None-Match when an ETag is cached and returns 304 result', async () => {
    setCachedEtag(url, '"abc123"');

    const mockFetch = vi.fn(async (u: string, opts: any) => {
      // assert that the proxied URL was called and header contains If-None-Match
      const headers = opts?.headers || {};
      expect(headers['If-None-Match'] || headers['If-None-Match'.toLowerCase()]).toBe('"abc123"');
      return {
        status: 304,
        headers: { get: (k: string) => null },
        text: async () => ''
      };
    });

    (globalThis as any).fetch = mockFetch;

    const res = await fetchOpds2Feed(url, null);
    expect(res.status).toBe(304);
    expect(res.books).toBeDefined();
    expect(res.books.length).toBe(0);
    expect(mockFetch).toHaveBeenCalled();
  });

  it('parses JSON response and stores ETag', async () => {
    const body = JSON.stringify({ metadata: { title: 'Feed' }, publications: [{ metadata: { title: 'X' }, links: [{ href: '/x', rel: 'http://opds-spec.org/acquisition/borrow', type: 'application/epub+zip' }] }] });
    const mockFetch = vi.fn(async (u: string, opts: any) => {
      return {
        status: 200,
        headers: { get: (k: string) => k.toLowerCase() === 'etag' ? '"etag-200"' : (k.toLowerCase() === 'content-type' ? 'application/opds+json' : null) },
        text: async () => body
      };
    });
    (globalThis as any).fetch = mockFetch;

    const res = await fetchOpds2Feed(url, null);
    expect(res.status).toBe(200);
    expect(res.books.length).toBe(1);
    // ETag should be cached
    const cached = getCachedEtag(url);
    expect(cached).toBe('"etag-200"');
  });
});
