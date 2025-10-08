import { describe, it, expect } from 'vitest';
import { parseOpds2Json } from '../opds';
import { parseOpds1Xml } from '../opds';

describe('OPDS parsers borrow detection', () => {
  it('detects borrow link and borrowUrl from OPDS2 publication links', () => {
    const sample = {
      metadata: { title: 'Sample' },
      publications: [
        {
          metadata: { title: 'Borrowable Book' },
          links: [
            { rel: 'http://opds-spec.org/acquisition/borrow', href: 'https://example.org/works/1/borrow', type: 'application/atom+xml;type=entry;profile=opds-catalog' },
            { rel: 'http://opds-spec.org/image', href: '/covers/1.jpg', type: 'image/jpeg' }
          ]
        }
      ]
    };

    const { books } = parseOpds2Json(sample, 'https://example.org/');
    expect(books.length).toBe(1);
    const b = books[0];
    expect(b.isBorrowable).toBeTruthy();
    expect(b.borrowUrl).toBe('https://example.org/works/1/borrow');
  });

  it('detects borrow link and borrowUrl from OPDS1 Atom entry', () => {
    const xml = `<?xml version="1.0" encoding="utf-8"?>
    <feed xmlns="http://www.w3.org/2005/Atom" xmlns:opds="http://opds-spec.org/2010/catalog">
      <entry>
        <title>Borrowable Atom Book</title>
        <link rel="http://opds-spec.org/acquisition/borrow" href="https://example.org/works/2/borrow" type="application/atom+xml;type=entry;profile=opds-catalog" />
        <link rel="http://opds-spec.org/image" href="/covers/2.jpg" />
        <id>urn:uuid:2</id>
      </entry>
    </feed>`;

    const { books } = parseOpds1Xml(xml, 'https://example.org/');
    expect(books.length).toBe(1);
    const b = books[0];
    expect(b.isBorrowable).toBeTruthy();
    expect(b.borrowUrl).toBe('https://example.org/works/2/borrow');
  });
});
