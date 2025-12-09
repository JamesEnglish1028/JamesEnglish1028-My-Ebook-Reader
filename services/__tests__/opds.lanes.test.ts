import { describe, expect, it } from 'vitest';

import { groupBooksByCollectionsAsLanes } from '../opds';
import { books } from './fixtures/opdsCollectionsFixtures';

describe('groupBooksByCollectionsAsLanes', () => {
  it('should group books by collections as category lanes', () => {
    const result = groupBooksByCollectionsAsLanes(books, [], { next: undefined, prev: undefined, first: undefined, last: undefined });
    expect(result.categoryLanes).toHaveLength(2);
    const uplOpenLane = result.categoryLanes.find(lane => lane.category.label === 'Fiction');
    expect(uplOpenLane).toBeDefined();
    expect(uplOpenLane && uplOpenLane.books[0].title).toBe('Book 1');
    expect(uplOpenLane && uplOpenLane.books[1].title).toBe('Book 2');
    const bestsellersLane = result.categoryLanes.find(lane => lane.category.label === 'Bestsellers');
    expect(bestsellersLane).toBeDefined();
    expect(bestsellersLane && bestsellersLane.books[0].title).toBe('Book 2');
    expect(result.uncategorizedBooks).toHaveLength(1);
    expect(result.uncategorizedBooks[0].title).toBe('Book 3');
    expect(result.collectionLinks).toHaveLength(2);
    const collectionTitles = result.collectionLinks.map(c => c.title);
    expect(collectionTitles).toContain('Fiction');
    expect(collectionTitles).toContain('Bestsellers');
  });
});
