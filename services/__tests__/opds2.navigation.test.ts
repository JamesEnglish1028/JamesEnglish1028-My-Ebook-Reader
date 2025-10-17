import { describe, it, expect } from 'vitest';

import { parseOpds2Json } from '../opds2';

describe('parseOpds2Json - navigation/catalog inference', () => {
  it('infers catalog navigation items when type is application/opds+json and rel is missing', () => {
    const json = {
      metadata: { title: 'Registry' },
      navigation: [
        { title: 'Example Catalog', href: '/catalog/example', type: 'application/opds+json' },
      ],
    };

    const { navLinks } = parseOpds2Json(json, 'https://example.org/');
    expect(navLinks).toHaveLength(1);
    expect(navLinks[0].title).toBe('Example Catalog');
    expect(navLinks[0].url).toContain('/catalog/example');
    expect(navLinks[0].isCatalog).toBeTruthy();
    // When rel is absent but type indicates an OPDS catalog we infer 'subsection'
    expect(navLinks[0].rel).toBe('subsection');
  });
});
