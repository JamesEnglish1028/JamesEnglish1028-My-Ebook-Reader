import { describe, test, expect } from 'vitest';
import { parseOpds1Xml, extractCollectionNavigation, groupBooksByMode, getAvailableCollections, filterBooksByCollection } from '../opds';

describe('OPDS 1 Collection Navigation', () => {
  test('extracts collection navigation links from OPDS 1 books', () => {
    const mockOpds1Xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:opds="http://opds-spec.org/2010/catalog">
  <title>Test Catalog</title>
  <entry>
    <title>Book 1</title>
    <author><name>Author 1</name></author>
    <link rel="http://opds-spec.org/acquisition" href="/book1.epub" type="application/epub+zip"/>
    <link rel="collection" href="/collection/fantasy" title="Fantasy Books"/>
    <link rel="collection" href="/collection/scifi" title="Science Fiction"/>
  </entry>
  <entry>
    <title>Book 2</title>
    <author><name>Author 2</name></author>
    <link rel="http://opds-spec.org/acquisition" href="/book2.epub" type="application/epub+zip"/>
    <link rel="collection" href="/collection/fantasy" title="Fantasy Books"/>
  </entry>
</feed>`;

    const { books } = parseOpds1Xml(mockOpds1Xml, 'https://example.com');
    
    expect(books).toHaveLength(2);
    
    // First book should have 2 collection links
    expect(books[0].collections).toHaveLength(2);
    expect(books[0].collections).toEqual([
      { title: 'Fantasy Books', href: 'https://example.com/collection/fantasy' },
      { title: 'Science Fiction', href: 'https://example.com/collection/scifi' }
    ]);
    
    // Second book should have 1 collection link
    expect(books[1].collections).toHaveLength(1);
    expect(books[1].collections).toEqual([
      { title: 'Fantasy Books', href: 'https://example.com/collection/fantasy' }
    ]);
  });

  test('extractCollectionNavigation creates unique collection list', () => {
    const books = [
      {
        title: 'Book 1',
        author: 'Author 1',
        coverImage: null,
        downloadUrl: 'https://example.com/book1',
        summary: null,
        collections: [
          { title: 'Fantasy Books', href: 'https://example.com/collection/fantasy' },
          { title: 'Science Fiction', href: 'https://example.com/collection/scifi' }
        ]
      },
      {
        title: 'Book 2',
        author: 'Author 2',
        coverImage: null,
        downloadUrl: 'https://example.com/book2',
        summary: null,
        collections: [
          { title: 'Fantasy Books', href: 'https://example.com/collection/fantasy' }
        ]
      }
    ];

    const collectionLinks = extractCollectionNavigation(books);
    
    // Should have 2 unique collections (Fantasy and Science Fiction)
    expect(collectionLinks).toHaveLength(2);
    
    // Verify the collections are present (order might vary)
    const hrefs = collectionLinks.map(c => c.href);
    expect(hrefs).toContain('https://example.com/collection/fantasy');
    expect(hrefs).toContain('https://example.com/collection/scifi');
  });

  test('getAvailableCollections extracts collection names', () => {
    const books = [
      {
        title: 'Fantasy Book',
        author: 'Author 1',
        coverImage: null,
        downloadUrl: 'https://example.com/book1',
        summary: null,
        collections: [
          { title: 'Fantasy Books', href: 'https://example.com/collection/fantasy' }
        ]
      }
    ];

    const collections = getAvailableCollections(books, []);
    
    // Should extract collection names for filtering
    expect(collections).toHaveLength(1);
    expect(collections[0]).toBe('Fantasy Books');
  });

  test('filterBooksByCollection filters books correctly', () => {
    const books = [
      {
        title: 'Fantasy Book',
        author: 'Author 1', 
        coverImage: null,
        downloadUrl: 'https://example.com/book1',
        summary: null,
        collections: [
          { title: 'Fantasy Books', href: 'https://example.com/collection/fantasy' }
        ]
      },
      {
        title: 'Sci-Fi Book',
        author: 'Author 2',
        coverImage: null,
        downloadUrl: 'https://example.com/book2',
        summary: null,
        collections: [
          { title: 'Sci-Fi Books', href: 'https://example.com/collection/scifi' }
        ]
      }
    ];

    // Filter by Fantasy Books collection
    const fantasyBooks = filterBooksByCollection(books, 'Fantasy Books', []);
    expect(fantasyBooks).toHaveLength(1);
    expect(fantasyBooks[0].title).toBe('Fantasy Book');
    
    // Filter by all collections
    const allBooks = filterBooksByCollection(books, 'all', []);
    expect(allBooks).toHaveLength(2);
  });
});