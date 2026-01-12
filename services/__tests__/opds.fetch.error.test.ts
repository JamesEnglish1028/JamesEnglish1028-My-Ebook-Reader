import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchCatalogContent } from '../opds';
import * as opds2 from '../opds2';

const jsonResponse = (body: string, status = 200) =>
  new Response(body, { status, headers: { 'Content-Type': 'application/opds+json' } });

describe('fetchCatalogContent error propagation', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns parser error when parseOpds2Json reports one', async () => {
    const parseSpy = vi.spyOn(opds2, 'parseOpds2Json').mockReturnValue({
      books: [],
      navLinks: [],
      pagination: {},
      error: 'boom from parser',
    } as any);

    const fetchMock = vi.spyOn(global, 'fetch' as any).mockResolvedValue(jsonResponse('{}'));

    const result = await fetchCatalogContent('https://example.org/feed', 'https://example.org', '2');

    expect(parseSpy).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalled();
    expect(result.error).toBe('boom from parser');
    expect(result.books).toEqual([]);
    expect(result.navLinks).toEqual([]);
  });
});
