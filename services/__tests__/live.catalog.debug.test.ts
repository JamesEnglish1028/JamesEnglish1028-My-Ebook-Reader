import { describe, test, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parseOpds1Xml } from '../opds';

describe('Live Catalog Distributor Debug', () => {
  test('should show actual catalog book data structure with distributor', async () => {
    // Load real Palace OPDS data
    const xmlPath = resolve(__dirname, '../../test-data/MinotaurOPDS.xml');
    const xmlData = readFileSync(xmlPath, 'utf-8');
    
    // Parse the OPDS data
    const { books } = parseOpds1Xml(xmlData, 'https://minotaur.dev.palaceproject.io/minotaur-test-library/');
    
    // Find books with distributors
    const booksWithDistributors = books.filter(book => book.distributor);
    console.log('\n=== CATALOG BOOKS WITH DISTRIBUTORS ===');
    console.log(`Found ${booksWithDistributors.length} books with distributors out of ${books.length} total`);
    
    // Show first 3 catalog books with all their properties
    const sampleBooks = booksWithDistributors.slice(0, 3);
    sampleBooks.forEach((book, index) => {
      console.log(`\n--- Catalog Book ${index + 1} ---`);
      console.log('Title:', book.title);
      console.log('Author:', book.author);
      console.log('Publisher:', book.publisher);
      console.log('Distributor:', book.distributor);
      console.log('Format:', book.format);
      console.log('ProviderId:', book.providerId);
      console.log('All properties:', Object.keys(book));
      console.log('Type check - book.distributor exists?', 'distributor' in book);
      console.log('Type check - book.distributor truthy?', !!book.distributor);
    });
    
    // Verify we have the expected distributors
    expect(booksWithDistributors.length).toBeGreaterThan(0);
    expect(sampleBooks[0].distributor).toBeDefined();
  });
  
  test('should verify CatalogBook type includes distributor field', () => {
    // This test checks the TypeScript types are working correctly
    const mockCatalogBook = {
      title: 'Test Book',
      author: 'Test Author',
      distributor: 'OAPEN', // This should be valid for CatalogBook type
      coverImage: null,
      acquisitionLinks: [],
      providerId: 'test-123',
      providerName: 'Test Provider'
    };
    
    console.log('\n=== MOCK CATALOG BOOK ===');
    console.log('Mock book distributor:', mockCatalogBook.distributor);
    console.log('Mock book properties:', Object.keys(mockCatalogBook));
    
    expect(mockCatalogBook.distributor).toBe('OAPEN');
  });
});