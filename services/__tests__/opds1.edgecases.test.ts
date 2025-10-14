import { describe, it, expect } from 'vitest';

import { parseOpds1Xml } from '../opds';

describe('parseOpds1Xml edge cases', () => {
  it('detects indirectAcquisition when namespaced (opds:indirectAcquisition)', () => {
    const xml = `<?xml version="1.0"?>
    <feed xmlns="http://www.w3.org/2005/Atom" xmlns:opds="http://opds-spec.org/2010/catalog">
      <entry>
        <title>Namespaced Indirect</title>
        <author><name>Auth</name></author>
        <link rel="http://opds-spec.org/acquisition" href="/acq/1">
          <opds:indirectAcquisition type="application/epub+zip"/>
        </link>
      </entry>
    </feed>`;

    const { books } = parseOpds1Xml(xml, 'https://example.com/');
    expect(books.length).toBe(1);
    expect(books[0].downloadUrl).toContain('/acq/1');
    expect(books[0].format).toBe('EPUB');
  });

  it('handles link without type but nested indirectAcquisition deep in tree', () => {
    const xml = `<?xml version="1.0"?>
    <feed xmlns="http://www.w3.org/2005/Atom">
      <entry>
        <title>Deep Indirect</title>
        <author><name>Auth</name></author>
        <link rel="http://opds-spec.org/acquisition" href="/acq/2">
          <group>
            <indirectAcquisition>
              <indirectAcquisition type="application/pdf" />
            </indirectAcquisition>
          </group>
        </link>
      </entry>
    </feed>`;

    const { books } = parseOpds1Xml(xml, 'https://example.com/');
    expect(books.length).toBe(1);
    expect(books[0].format).toBe('PDF');
  });

  it('prefers acquisition link even when there are multiple links with different rel casing', () => {
    const xml = `<?xml version="1.0"?>
    <feed xmlns="http://www.w3.org/2005/Atom">
      <entry>
        <title>Rel Casing</title>
        <author><name>Auth</name></author>
        <link rel="alternate" href="/alt/1" />
        <link rel="http://opds-spec.org/acquisition/borrow" href="/borrow/1" type="application/epub+zip" />
      </entry>
    </feed>`;

    const { books } = parseOpds1Xml(xml, 'https://example.com/');
    expect(books.length).toBe(1);
    expect(books[0].downloadUrl).toContain('/borrow/1');
  });

  it('returns no books but does not throw for feed without entries', () => {
    const xml = `<?xml version="1.0"?>
    <feed xmlns="http://www.w3.org/2005/Atom">
      <title>Empty Feed</title>
    </feed>`;

    const { books, navLinks } = parseOpds1Xml(xml, 'https://example.com/');
    expect(books).toHaveLength(0);
    expect(navLinks).toHaveLength(0);
  });
});
