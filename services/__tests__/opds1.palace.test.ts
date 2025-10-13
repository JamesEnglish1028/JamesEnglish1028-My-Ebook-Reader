import { describe, test, expect } from 'vitest';
import { parseOpds1Xml, groupBooksByMode, getAvailableCollections, filterBooksByCollection } from '../opds';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('OPDS 1 Collection Detection from Real Data', () => {
  test('parses collection links from Minotaur OPDS 1 XML correctly', () => {
    // Read the real Minotaur test data
    const xmlPath = resolve(__dirname, '../../test-data/MinotaurOPDS.xml');
    const xmlData = readFileSync(xmlPath, 'utf-8');
    
    const { books } = parseOpds1Xml(xmlData, 'https://minotaur.dev.palaceproject.io/minotaur-test-library/');
    
    // Should have parsed books
    expect(books.length).toBeGreaterThan(0);
    
    // Some books should have collection links
    const booksWithCollections = books.filter(book => book.collections && book.collections.length > 0);
    expect(booksWithCollections.length).toBeGreaterThan(0);
    
    // Check that we have the expected collection titles
    const allCollections = books.flatMap(book => book.collections || []);
    const collectionTitles = [...new Set(allCollections.map(c => c.title))];
    
    expect(collectionTitles).toContain('UPLOpen');
    // Check for Courtney's collection (might have trailing space)
    const hasCourtneysCollection = collectionTitles.some(title => title.includes('Courtney\'s Blackstone'));
    expect(hasCourtneysCollection).toBe(true);
    
    console.log('Found collections:', collectionTitles);
    console.log('Total books with collections:', booksWithCollections.length);
  });

  test('UI detection logic should recognize OPDS 1 collections', () => {
    // Read the real Minotaur test data
    const xmlPath = resolve(__dirname, '../../test-data/MinotaurOPDS.xml');
    const xmlData = readFileSync(xmlPath, 'utf-8');
    
    const { books } = parseOpds1Xml(xmlData, 'https://minotaur.dev.palaceproject.io/minotaur-test-library/');
    
    // Check availability detection logic (same as used in Library.tsx)
    const hasCollections = books.some(book => book.collections && book.collections.length > 0);
    expect(hasCollections).toBe(true);
    
    // Test the grouping function that provides collectionLinks
    const result = groupBooksByMode(books, [], {}, 'subject');
    expect(result.collectionLinks.length).toBeGreaterThan(0);
    
    // Verify the collection links are correctly extracted
    const collectionTitles = result.collectionLinks.map(c => c.title);
    expect(collectionTitles).toContain('UPLOpen');
    // Check for Courtney's collection (might have trailing space)
    const hasCourtneysCollection = collectionTitles.some(title => title.includes('Courtney\'s Blackstone'));
    expect(hasCourtneysCollection).toBe(true);
    
    console.log('CollectionLinks extracted:', result.collectionLinks);
  });

  test('Collection filtering should work with OPDS 1 data', () => {
    // Read the real Minotaur test data
    const xmlPath = resolve(__dirname, '../../test-data/MinotaurOPDS.xml');
    const xmlData = readFileSync(xmlPath, 'utf-8');
    
    const { books } = parseOpds1Xml(xmlData, 'https://minotaur.dev.palaceproject.io/minotaur-test-library/');
    
    // Test collection filtering
    const availableCollections = getAvailableCollections(books, []);
    expect(availableCollections.length).toBeGreaterThan(0);
    
    // Should include expected collections
    expect(availableCollections).toContain('UPLOpen');
    expect(availableCollections.some(collection => collection.includes('Courtney\'s Blackstone'))).toBe(true);
    
    // Test filtering by specific collection
    const uplOpenBooks = filterBooksByCollection(books, 'UPLOpen', []);
    expect(uplOpenBooks.length).toBeGreaterThan(0);
    
    // All filtered books should have the expected collection
    uplOpenBooks.forEach(book => {
      const hasUplOpen = book.collections?.some(collection => collection.title === 'UPLOpen');
      expect(hasUplOpen).toBe(true);
    });
  });
});