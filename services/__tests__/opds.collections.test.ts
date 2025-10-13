import { describe, it, expect } from 'vitest';
import { parseOpds1Xml, groupBooksByCollections, groupBooksByCollectionsAsLanes } from '../opds';

describe('OPDS1 Collections Support', () => {
  it('should parse collection links from OPDS1 entries', () => {
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:opds="http://opds-spec.org/2010/catalog">
  <title>Test Catalog</title>
  <entry>
    <title>Test Book 1</title>
    <author><name>Test Author</name></author>
    <link rel="http://opds-spec.org/acquisition" href="/books/1.epub" type="application/epub+zip"/>
    <link rel="collection" href="/collections/fiction" title="Fiction"/>
  </entry>
  <entry>
    <title>Test Book 2</title>
    <author><name>Test Author</name></author>
    <link rel="http://opds-spec.org/acquisition" href="/books/2.epub" type="application/epub+zip"/>
    <link rel="collection" href="/collections/fiction" title="Fiction"/>
    <link rel="collection" href="/collections/bestsellers" title="Bestsellers"/>
  </entry>
  <entry>
    <title>Test Book 3</title>
    <author><name>Test Author</name></author>
    <link rel="http://opds-spec.org/acquisition" href="/books/3.epub" type="application/epub+zip"/>
  </entry>
</feed>`;

    const result = parseOpds1Xml(xmlContent, 'https://example.com');
    
    expect(result.books).toHaveLength(3);
    
    // First book should have one collection
    expect(result.books[0].collections).toHaveLength(1);
    expect(result.books[0].collections![0].title).toBe('Fiction');
    expect(result.books[0].collections![0].href).toBe('https://example.com/collections/fiction');
    
    // Second book should have two collections
    expect(result.books[1].collections).toHaveLength(2);
    expect(result.books[1].collections![0].title).toBe('Fiction');
    expect(result.books[1].collections![1].title).toBe('Bestsellers');
    
    // Third book should have no collections
    expect(result.books[2].collections).toBeUndefined();
  });

  it('should group books by collections correctly', () => {
    const books = [
      {
        title: 'Book 1',
        author: 'Author 1',
        coverImage: null,
        downloadUrl: '/books/1.epub',
        summary: null,
        collections: [
          { title: 'Fiction', href: '/collections/fiction' },
        ]
      },
      {
        title: 'Book 2',
        author: 'Author 2',
        coverImage: null,
        downloadUrl: '/books/2.epub',
        summary: null,
        collections: [
          { title: 'Fiction', href: '/collections/fiction' },
          { title: 'Bestsellers', href: '/collections/bestsellers' },
        ]
      },
      {
        title: 'Book 3',
        author: 'Author 3',
        coverImage: null,
        downloadUrl: '/books/3.epub',
        summary: null,
      }
    ];

    const result = groupBooksByCollections(books, [], {});
    
    expect(result.collections).toHaveLength(2);
    expect(result.uncategorizedBooks).toHaveLength(1);
    
    // Check Fiction collection
    const fictionCollection = result.collections.find(c => c.collection.title === 'Fiction');
    expect(fictionCollection).toBeDefined();
    expect(fictionCollection!.books).toHaveLength(2);
    expect(fictionCollection!.books[0].title).toBe('Book 1');
    expect(fictionCollection!.books[1].title).toBe('Book 2');
    
    // Check Bestsellers collection
    const bestsellersCollection = result.collections.find(c => c.collection.title === 'Bestsellers');
    expect(bestsellersCollection).toBeDefined();
    expect(bestsellersCollection!.books).toHaveLength(1);
    expect(bestsellersCollection!.books[0].title).toBe('Book 2');
    
    // Check uncategorized books
    expect(result.uncategorizedBooks[0].title).toBe('Book 3');
  });

  describe('Collection Categorization as Lanes', () => {
    it('should group books by collections as category lanes', () => {
      const books = [
        {
          title: 'Book 1',
          author: 'Author 1',
          coverImage: null,
          downloadUrl: '/books/1.epub',
          summary: null,
          collections: [
            { title: 'UPLOpen', href: '/collections/uplopen' }
          ]
        },
        {
          title: 'Book 2',
          author: 'Author 2',
          coverImage: null,
          downloadUrl: '/books/2.epub',
          summary: null,
          collections: [
            { title: 'UPLOpen', href: '/collections/uplopen' },
            { title: 'Courtney\'s Blackstone lane', href: '/collections/blackstone' }
          ]
        },
        {
          title: 'Book 3',
          author: 'Author 3',
          coverImage: null,
          downloadUrl: '/books/3.epub',
          summary: null,
          collections: [
            { title: 'Courtney\'s Blackstone lane', href: '/collections/blackstone' }
          ]
        },
        {
          title: 'Book 4',
          author: 'Author 4',
          coverImage: null,
          downloadUrl: '/books/4.epub',
          summary: null,
          // No collections - should be uncategorized
        }
      ];

      const result = groupBooksByCollectionsAsLanes(books, [], { next: undefined, prev: undefined, first: undefined, last: undefined });

      // Should have 2 category lanes (one for each collection)
      expect(result.categoryLanes).toHaveLength(2);

      // Find UPLOpen lane
      const uplOpenLane = result.categoryLanes.find(lane => lane.category.label === 'UPLOpen');
      expect(uplOpenLane).toBeDefined();
      expect(uplOpenLane!.books).toHaveLength(2); // Book 1 and Book 2
      expect(uplOpenLane!.category.scheme).toBe('http://opds-spec.org/collection');
      expect(uplOpenLane!.category.term).toBe('/collections/uplopen');

      // Find Blackstone lane
      const blackstoneLane = result.categoryLanes.find(lane => lane.category.label === 'Courtney\'s Blackstone lane');
      expect(blackstoneLane).toBeDefined();
      expect(blackstoneLane!.books).toHaveLength(2); // Book 2 and Book 3
      expect(blackstoneLane!.category.scheme).toBe('http://opds-spec.org/collection');
      expect(blackstoneLane!.category.term).toBe('/collections/blackstone');

      // Should have 1 uncategorized book (Book 4)
      expect(result.uncategorizedBooks).toHaveLength(1);
      expect(result.uncategorizedBooks[0].title).toBe('Book 4');

      // Should have collection links
      expect(result.collectionLinks).toHaveLength(2);
      const collectionTitles = result.collectionLinks.map(c => c.title);
      expect(collectionTitles).toContain('UPLOpen');
      expect(collectionTitles).toContain('Courtney\'s Blackstone lane');
    });

    it('should handle books with no collections', () => {
      const booksWithoutCollections = [
        {
          title: 'Uncategorized Book',
          author: 'Author',
          coverImage: null,
          downloadUrl: '/books/uncategorized.epub',
          summary: null,
          // No collections
        }
      ];

      const result = groupBooksByCollectionsAsLanes(booksWithoutCollections, [], { next: undefined, prev: undefined, first: undefined, last: undefined });

      expect(result.categoryLanes).toHaveLength(0);
      expect(result.uncategorizedBooks).toHaveLength(1);
      expect(result.collectionLinks).toHaveLength(0);
    });

    it('should handle empty books array', () => {
      const result = groupBooksByCollectionsAsLanes([], [], { next: undefined, prev: undefined, first: undefined, last: undefined });

      expect(result.categoryLanes).toHaveLength(0);
      expect(result.uncategorizedBooks).toHaveLength(0);
      expect(result.collectionLinks).toHaveLength(0);
      expect(result.books).toHaveLength(0);
    });

    it('should handle books with multiple collections', () => {
      const bookWithMultipleCollections = [
        {
          title: 'Multi-Collection Book',
          author: 'Author',
          coverImage: null,
          downloadUrl: '/books/multi.epub',
          summary: null,
          collections: [
            { title: 'Collection A', href: '/collections/a' },
            { title: 'Collection B', href: '/collections/b' }
          ]
        }
      ];

      const result = groupBooksByCollectionsAsLanes(bookWithMultipleCollections, [], { next: undefined, prev: undefined, first: undefined, last: undefined });

      // Should create 2 lanes
      expect(result.categoryLanes).toHaveLength(2);
      
      // The same book should appear in both lanes
      const collectionALane = result.categoryLanes.find(lane => lane.category.label === 'Collection A');
      const collectionBLane = result.categoryLanes.find(lane => lane.category.label === 'Collection B');
      
      expect(collectionALane!.books).toHaveLength(1);
      expect(collectionBLane!.books).toHaveLength(1);
      expect(collectionALane!.books[0].title).toBe('Multi-Collection Book');
      expect(collectionBLane!.books[0].title).toBe('Multi-Collection Book');
    });
  });
});