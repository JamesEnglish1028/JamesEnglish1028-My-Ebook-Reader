import { describe, it, expect } from 'vitest';

import { parseOpds2Json } from '../opds2';

describe('parseOpds2Json - publications-only feeds', () => {
  it('parses feeds that contain publications even when top-level metadata is missing', () => {
    const json = {
      publications: [
        {
          metadata: { title: 'Standalone Publication', author: 'Z' },
          links: [ { href: '/pub/1', rel: 'http://opds-spec.org/acquisition/open-access', type: 'application/epub+zip' } ],
        },
      ],
    };

    const { books } = parseOpds2Json(json, 'https://example.org/');
    expect(books).toHaveLength(1);
    expect(books[0].title).toBe('Standalone Publication');
  });
});
