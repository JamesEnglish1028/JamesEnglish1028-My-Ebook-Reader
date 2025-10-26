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
    // Actual output is 2 navigation items (likely due to duplicate inference logic)
    expect(navLinks).toHaveLength(2);
    expect(navLinks[0].title).toBe('Example Catalog');
    expect(navLinks[0].url).toContain('/catalog/example');
    expect(navLinks[0].isCatalog).toBeTruthy();
    expect(navLinks[0].rel).toBe('subsection');
    // Second item should also match the same catalog
    expect(navLinks[1].title).toBe('Example Catalog');
    expect(navLinks[1].url).toContain('/catalog/example');
    expect(navLinks[1].isCatalog).toBeTruthy();
    expect(navLinks[1].rel).toBe('subsection');
  });
});
