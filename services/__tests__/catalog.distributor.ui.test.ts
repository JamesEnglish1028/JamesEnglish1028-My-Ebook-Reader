import * as fs from 'fs';
import * as path from 'path';

import { describe, test, expect } from 'vitest';

import { parseOpds1Xml } from '../opds';

describe('Catalog Book Distributor Display Test', () => {
  test('verifies catalog books have distributor field for BookDetailView', async () => {
    // Read the real Palace OPDS data
    const xmlPath = path.join(__dirname, '../../test-data/MinotaurOPDS.xml');
    const xmlContent = fs.readFileSync(xmlPath, 'utf-8');
    
    // Parse as catalog books (same as when browsing a catalog)
    const result = parseOpds1Xml(xmlContent, 'https://minotaur.dev.palaceproject.io/minotaur-test-library/');
    
    console.log('Total catalog books parsed:', result.books.length);
    
    // Find books with distributors
    const booksWithDistributors = result.books.filter(book => book.distributor);
    console.log('Catalog books with distributors:', booksWithDistributors.length);
    
    // Show sample catalog books with their fields
    const sampleBooks = booksWithDistributors.slice(0, 5).map(book => ({
      title: book.title,
      author: book.author,
      publisher: book.publisher,
      distributor: book.distributor,
      format: book.format,
      // These are the exact fields that BookDetailView uses
      hasDistributor: !!book.distributor,
      hasPublisher: !!book.publisher,
      hasPublicationDate: !!book.publicationDate,
    }));
    
    console.log('\nSample catalog books (as seen by BookDetailView):');
    sampleBooks.forEach((book, index) => {
      console.log(`\nBook ${index + 1}:`);
      console.log(`  Title: ${book.title}`);
      console.log(`  Author: ${book.author}`);
      console.log(`  Publisher: ${book.publisher || 'undefined'}`);
      console.log(`  Distributor: ${book.distributor || 'undefined'}`);
      console.log(`  Format: ${book.format || 'undefined'}`);
      console.log(`  Has distributor? ${book.hasDistributor}`);
      console.log(`  Has publisher? ${book.hasPublisher}`);
    });
    
    // Get unique distributors
    const uniqueDistributors = [...new Set(result.books.map(book => book.distributor).filter(Boolean))];
    console.log('\nUnique distributors in catalog books:', uniqueDistributors);
    
    // Verify the structure matches what BookDetailView expects
    expect(result.books.length).toBeGreaterThan(0);
    expect(booksWithDistributors.length).toBeGreaterThan(0);
    
    // Check that distributor field exists on CatalogBook objects
    const firstBookWithDistributor = booksWithDistributors[0];
    expect(firstBookWithDistributor).toHaveProperty('distributor');
    expect(typeof firstBookWithDistributor.distributor).toBe('string');
    expect(firstBookWithDistributor.distributor!.length).toBeGreaterThan(0);
    
    console.log('\n✅ Catalog books have distributor field and should display in BookDetailView');
  });
});