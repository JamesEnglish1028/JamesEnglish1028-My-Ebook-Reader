import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as opds2 from '../opds2';

describe('opds2.ts - credential migration and edge error cases', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('migrates legacy credentials from localStorage', async () => {
    localStorage.setItem('mebooks.opds.credentials', JSON.stringify([
      { host: 'test.org', username: 'u', password: 'p' },
    ]));
    const creds = await opds2.getStoredOpdsCredentials();
    expect(creds.some(c => c.host === 'test.org')).toBe(true);
    expect(localStorage.getItem('mebooks.opds.credentials')).toBeNull();
  });

  it('handles malformed legacy credentials gracefully', async () => {
    localStorage.setItem('mebooks.opds.credentials', 'not-json');
    const creds = await opds2.getStoredOpdsCredentials();
    expect(Array.isArray(creds)).toBe(true);
  });

  it('parseOpds2Json tolerates missing metadata', () => {
    const parsed = opds2.parseOpds2Json({}, 'https://x/');
    expect(parsed.books).toEqual([]);
    expect(parsed.navLinks).toEqual([]);
  });

  it('parseOpds2Json throws on non-object', () => {
  expect(() => opds2.parseOpds2Json(null, 'https://x/')).toThrow(/catalog format/);
  });

  it('fetchOpds2Feed returns 401 and empty books on unauthorized', async () => {
    const origFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async () =>
      new Response('Unauthorized', { status: 401, headers: { 'Content-Type': 'text/plain' } }),
    );
    const res = await opds2.fetchOpds2Feed('https://x/', null);
    expect(res.status).toBe(401);
    expect(res.books).toEqual([]);
    globalThis.fetch = origFetch;
  });

  it('fetchOpds2Feed throws on malformed JSON', async () => {
    const origFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async () =>
      new Response('not-json', { status: 200, headers: { 'Content-Type': 'application/opds+json' } }),
    );
    await expect(opds2.fetchOpds2Feed('https://x/', null)).rejects.toBeDefined();
    globalThis.fetch = origFetch;
  });
});
