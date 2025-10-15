import { describe, expect, it, vi } from 'vitest';
import { maybeProxyForCors, proxiedUrl } from '../utils';

describe('utils.ts - proxiedUrl and maybeProxyForCors', () => {
  it('proxiedUrl returns a CORS proxy URL for valid input', () => {
    const url = 'https://example.com/resource';
    const proxied = proxiedUrl(url);
    expect(proxied).toMatch(/corsproxy|proxy/);
    expect(proxied).toContain(encodeURIComponent(url));
  });

  it('proxiedUrl returns empty string for invalid URL', () => {
    expect(proxiedUrl('not a url')).toBe('');
  });

  it('maybeProxyForCors returns proxied URL on network error', async () => {
    const url = 'https://example.com/resource';
    const origFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async () => { throw new Error('network'); });
    const result = await maybeProxyForCors(url);
    expect(result).toMatch(/corsproxy|proxy/);
    globalThis.fetch = origFetch;
  });

  it('maybeProxyForCors returns direct URL if CORS headers allow', async () => {
    const url = 'https://example.com/resource';
    const resp = new Response(null, { status: 200, headers: { 'access-control-allow-origin': '*' } });
    const origFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async () => resp);
    const result = await maybeProxyForCors(url);
    expect(result).toBe(url);
    globalThis.fetch = origFetch;
  });

  it('maybeProxyForCors returns proxied URL if HEAD returns 405 and GET fails', async () => {
    const url = 'https://example.com/resource';
    const resp405 = new Response(null, { status: 405 });
    const origFetch = globalThis.fetch;
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce(resp405)
      .mockRejectedValueOnce(new Error('fail'));
    const result = await maybeProxyForCors(url);
    expect(result).toMatch(/corsproxy|proxy/);
    globalThis.fetch = origFetch;
  });
});
