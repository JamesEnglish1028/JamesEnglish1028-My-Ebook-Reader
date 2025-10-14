import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { resolveAcquisitionChainOpds1 } from '../opds';

describe('resolveAcquisitionChainOpds1', () => {
  let origFetch: any;
  beforeEach(() => { origFetch = (globalThis as any).fetch; });
  afterEach(() => { (globalThis as any).fetch = origFetch; vi.restoreAllMocks(); });

  it('parses XML response with acquisition link', async () => {
    const xml = `<?xml version="1.0"?>
    <entry>
      <link rel="http://opds-spec.org/acquisition" href="/content/book.epub" type="application/epub+zip" />
    </entry>`;

    (globalThis as any).fetch = vi.fn(async () => ({ status: 200, ok: true, headers: { get: () => 'application/atom+xml' }, text: async () => xml }));

    const res = await resolveAcquisitionChainOpds1('https://opds.example/borrow/1', null);
    expect(res).toBe('https://opds.example/content/book.epub');
  });

  it('follows Location redirect', async () => {
    (globalThis as any).fetch = vi.fn(async () => ({ status: 302, ok: false, headers: { get: (k: string) => k.toLowerCase() === 'location' ? 'https://cdn.example/book.epub' : null }, text: async () => '' }));
    const res = await resolveAcquisitionChainOpds1('https://opds.example/borrow/2', null);
    expect(res).toBe('https://cdn.example/book.epub');
  });

  it('surfaces OPDS auth document on 401', async () => {
    const authDoc = { title: 'Library login', links: [{ href: 'https://auth.example', rel: 'authenticate' }] };
    (globalThis as any).fetch = vi.fn(async () => ({ status: 401, ok: false, headers: { get: (k: string) => k.toLowerCase() === 'content-type' ? 'application/vnd.opds.authentication.v1.0+json' : null }, text: async () => JSON.stringify(authDoc) }));

    await expect(resolveAcquisitionChainOpds1('https://opds.example/borrow/401', null)).rejects.toMatchObject({ authDocument: authDoc });
  });
});
