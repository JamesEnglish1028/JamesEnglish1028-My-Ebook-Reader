import { describe, it, expect } from 'vitest';

import { groupBooksByCollections } from '../opds';
import { books } from './fixtures/opdsCollectionsFixtures';

describe('groupBooksByCollections', () => {
  it('should group books by collections correctly', () => {
    const result = groupBooksByCollections(books, [], {});
    expect(result.collections).toHaveLength(2);
    expect(result.uncategorizedBooks).toHaveLength(1);
    const fictionCollection = result.collections.find(c => c.collection.title === 'Fiction');
    expect(fictionCollection).toBeDefined();
    expect(fictionCollection && fictionCollection.books[0].title).toBe('Book 1');
    expect(fictionCollection && fictionCollection.books[1].title).toBe('Book 2');
    const bestsellersCollection = result.collections.find(c => c.collection.title === 'Bestsellers');
    expect(bestsellersCollection).toBeDefined();
    expect(bestsellersCollection && bestsellersCollection.books[0].title).toBe('Book 2');
    expect(result.uncategorizedBooks[0].title).toBe('Book 3');
  });
});
