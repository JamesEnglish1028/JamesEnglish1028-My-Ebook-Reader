import { describe, it, expect } from 'vitest';

import { parseOpds2Json } from '../opds2';

describe('parseOpds2Json', () => {
  it('parses publications with string-embedded XML links', () => {
    const json = {
      publications: [
        {
          metadata: { title: 'XML Links Book', author: 'Author' },
          links: '<link href="/content/book.epub" rel="http://opds-spec.org/acquisition" type="application/epub+zip" />',
        },
      ],
    };

    const { books } = parseOpds2Json(json, 'https://example.com/catalog/');
    expect(books).toHaveLength(1);
    expect(books[0].title).toBe('XML Links Book');
    expect(books[0].downloadUrl).toContain('/content/book.epub');
    expect(books[0].format).toBe('EPUB');
  });

  it('handles nested indirectAcquisition and infers format', () => {
    const json = {
      publications: [
        {
          metadata: { title: 'Nested Indirect', author: 'A' },
          links: [
            { href: '/acq/1', rel: 'http://opds-spec.org/acquisition', type: 'application/vnd.some+json', indirectAcquisition: { type: 'application/epub+zip' } },
          ],
        },
      ],
    };

    const { books } = parseOpds2Json(json, 'https://example.com/');
    expect(books).toHaveLength(1);
    expect(books[0].format).toBe('EPUB');
  });

  it('falls back to content array when acquisitions missing', () => {
    const json = {
      publications: [
        {
          metadata: { title: 'Content Fallback', author: 'B' },
          content: [ { href: '/files/sample.pdf', type: 'application/pdf' } ],
        },
      ],
    };

    const { books } = parseOpds2Json(json, 'https://cdn.example.com/');
    expect(books).toHaveLength(1);
    expect(books[0].downloadUrl).toContain('/files/sample.pdf');
    expect(books[0].format).toBe('PDF');
  });

  it('parses a simple OPDS2 publication (happy path)', () => {
    const feed = {
      metadata: { title: 'Catalog' },
      publications: [
        {
          metadata: { title: 'Book One', author: 'Jane Reader', description: 'A test book', identifier: 'book-one' },
          links: [ { href: '/works/1', rel: 'http://opds-spec.org/acquisition/borrow', type: 'application/epub+zip' } ],
          images: [ { href: '/covers/1.jpg' } ],
        },
      ],
    };

    const { books } = parseOpds2Json(feed, 'https://example.org/');
    expect(books.length).toBe(1);
    const b = books[0];
    expect(b.title).toBe('Book One');
    expect(b.author).toBe('Jane Reader');
    expect(b.providerId).toBe('book-one');
    expect(b.format).toBe('EPUB');
    expect(b.coverImage).toContain('/covers/1.jpg');
  });
});
