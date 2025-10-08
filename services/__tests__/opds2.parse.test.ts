import { describe, it, expect } from 'vitest';
import { parseOpds2Json } from '../opds2';

describe('parseOpds2Json', () => {
  it('parses a simple OPDS2 publication (happy path)', () => {
    const feed = {
      metadata: { title: 'Catalog' },
      publications: [
        {
          metadata: { title: 'Book One', author: 'Jane Reader', description: 'A test book', identifier: 'book-one' },
          links: [ { href: '/works/1', rel: 'http://opds-spec.org/acquisition/borrow', type: 'application/epub+zip' } ],
          images: [ { href: '/covers/1.jpg' } ]
        }
      ]
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

  it('resolves indirectAcquisition chains to detect format', () => {
    const feed = {
      metadata: { title: 'Catalog' },
      publications: [
        {
          metadata: { title: 'Indirect Book', author: 'Proxy Author', identifier: 'indirect-1' },
          links: [ { href: '/borrow/1', rel: 'http://opds-spec.org/acquisition/borrow', indirectAcquisition: [{ type: 'application/pdf' }] } ]
        }
      ]
    };

    const { books } = parseOpds2Json(feed, 'https://opds.example/');
    expect(books.length).toBe(1);
    expect(books[0].format).toBe('PDF');
    expect(books[0].downloadUrl).toContain('/borrow/1');
  });

  it('handles rel arrays and prefers borrow rel when present', () => {
    const feed = {
      metadata: { title: 'Catalog' },
      publications: [
        {
          metadata: { title: 'MultiRel Book', author: 'Multi Author' },
          links: [
            { href: '/alternate/1', rel: ['alternate', 'http://opds-spec.org/acquisition/loan'], type: 'application/epub+zip' },
            { href: '/borrow/1', rel: ['http://opds-spec.org/acquisition/borrow'], type: 'application/epub+zip' }
          ]
        }
      ]
    };

    const { books } = parseOpds2Json(feed, 'https://multi.example/');
    expect(books.length).toBe(1);
    expect(books[0].downloadUrl).toContain('/borrow/1');
  });
});
