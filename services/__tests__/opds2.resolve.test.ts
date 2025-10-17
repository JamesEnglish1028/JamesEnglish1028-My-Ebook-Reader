import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { resolveAcquisitionChain } from '../opds2';

describe('resolveAcquisitionChain', () => {
  let origFetch: any;
  beforeEach(() => { origFetch = (globalThis as any).fetch; });
  afterEach(() => { (globalThis as any).fetch = origFetch; vi.restoreAllMocks(); });

  it('follows POST and reads URL from JSON body', async () => {
    (globalThis as any).fetch = vi.fn(async () => ({
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ url: 'https://cdn.example/content/book.epub' }),
      text: async () => '{}',
    }));

    const res = await resolveAcquisitionChain('https://opds.example/borrow/1', null);
    expect(res).toBe('https://cdn.example/content/book.epub');
  });

  it('follows POST redirect via Location header', async () => {
    (globalThis as any).fetch = vi.fn(async () => ({
      status: 302,
      headers: { get: (k: string) => k.toLowerCase() === 'location' ? 'https://cdn.example/redirected/book.epub' : null },
      text: async () => '',
    }));

    const res = await resolveAcquisitionChain('https://opds.example/borrow/2', null);
    expect(res).toBe('https://cdn.example/redirected/book.epub');
  });

  it('retries GET when POST returns 405 and reads JSON', async () => {
    const calls: any[] = [];
    (globalThis as any).fetch = vi.fn(async (_u: string, opts: any) => {
      calls.push(opts?.method);
      if (opts?.method === 'POST') return { status: 405, headers: { get: (): string | null => null }, text: async () => '' };
      return { status: 200, headers: { get: (): string => 'application/json' }, json: async () => ({ href: '/final/book.epub' }) };
    });

    const res = await resolveAcquisitionChain('https://opds.example/borrow/3', null);
    expect(res).toContain('/final/book.epub');
    expect(calls).toContain('POST');
    expect(calls).toContain('GET');
  });

  it('surfaces OPDS auth document on 401', async () => {
    const authDoc = { title: 'Library card', description: 'Use your library card PIN', links: [{ href: 'https://minotaur.example/auth', rel: 'authenticate', title: 'Sign in' }] };
    const calls: any[] = [];
    (globalThis as any).fetch = vi.fn(async (_u: string, opts: any) => {
      calls.push(opts?.method);
      // Simulate POST then GET; responder returns 401 with auth doc on GET
      if (opts?.method === 'POST') return { status: 405, headers: { get: () => null }, text: async () => '' };
      return { status: 401, headers: { get: (k: string) => k.toLowerCase() === 'content-type' ? 'application/vnd.opds.authentication.v1.0+json' : null }, text: async () => JSON.stringify(authDoc) };
    });

    await expect(resolveAcquisitionChain('https://opds.example/borrow/401', null)).rejects.toMatchObject({ authDocument: authDoc });
  });
});
