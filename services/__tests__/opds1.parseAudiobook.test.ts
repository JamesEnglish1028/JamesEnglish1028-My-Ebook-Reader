import { describe, it, expect } from 'vitest';

import { parseOpds1Xml } from '../opds';
import { xmlAudiobookFeed, xmlAudiobookEdgeFeed } from './fixtures/opds1AudiobookFixtures';

describe('OPDS1 Audiobook XML Parsing', () => {
  it('correctly detects audiobooks from schema:additionalType attribute', () => {
    const { books } = parseOpds1Xml(xmlAudiobookFeed, 'https://example.com/');
    expect(books).toHaveLength(3);
    const audiobook = books.find(b => b.title === 'Sample Audiobook');
    expect(audiobook).toBeDefined();
    expect(audiobook?.format).toBe('AUDIOBOOK');
    expect(audiobook?.acquisitionMediaType).toBe('http://bib.schema.org/Audiobook');
    const ebook = books.find(b => b.title === 'Sample E-book');
    expect(ebook).toBeDefined();
    expect(ebook?.format).toBe('EPUB');
    expect(ebook?.acquisitionMediaType).toBe('application/epub+zip');
    const defaultBook = books.find(b => b.title === 'Default Book');
    expect(defaultBook).toBeDefined();
    expect(defaultBook?.format).toBe('EPUB');
    expect(defaultBook?.acquisitionMediaType).toBe('application/epub+zip');
  });

  it('handles edge cases in audiobook detection', () => {
    const { books } = parseOpds1Xml(xmlAudiobookEdgeFeed, 'https://example.com/');
    expect(books).toHaveLength(2);
    const audiobook = books.find(b => b.title === 'Alternative Schema Audiobook');
    expect(audiobook).toBeDefined();
    expect(audiobook?.format).toBe('AUDIOBOOK');
    expect(audiobook?.acquisitionMediaType).toBe('http://bib.schema.org/Audiobook');
    const regularBook = books.find(b => b.title === 'Book Without Schema');
    expect(regularBook).toBeDefined();
    expect(regularBook?.format).toBe('EPUB');
    expect(regularBook?.acquisitionMediaType).toBe('application/epub+zip');
  });
});
