import { describe, expect, it } from 'vitest';
import { parseOpds1Xml } from '../opds';
import { xmlContent } from './fixtures/opdsCollectionsFixtures';

describe('OPDS1 parseOpds1Xml', () => {
  it('should parse collection links from OPDS1 entries', () => {
    const result = parseOpds1Xml(xmlContent, 'https://example.com');
    expect(result.books).toHaveLength(3);
    expect(result.books[0].collections).toHaveLength(1);
    expect(result.books[0].collections![0].title).toBe('Fiction');
    expect(result.books[0].collections![0].href).toBe('https://example.com/collections/fiction');
    expect(result.books[1].collections).toHaveLength(2);
    expect(result.books[1].collections![0].title).toBe('Fiction');
    expect(result.books[1].collections![1].title).toBe('Bestsellers');
    expect(result.books[2].collections).toBeUndefined();
  });
});
