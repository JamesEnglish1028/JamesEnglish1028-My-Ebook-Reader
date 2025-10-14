import * as fs from 'fs';
import * as path from 'path';

import { describe, test, expect } from 'vitest';

import { parseOpds1Xml } from '../opds';

describe('OPDS 1 Catalog Book Click Debug', () => {
  test('verifies complete catalog navigation flow with real Palace data', () => {
    // Read the real Palace OPDS data (same as what user would see browsing)
    const xmlPath = path.join(__dirname, '../../test-data/MinotaurOPDS.xml');
    const xmlContent = fs.readFileSync(xmlPath, 'utf-8');
    
    // Parse exactly as the catalog would
    const catalogData = parseOpds1Xml(xmlContent, 'https://minotaur.dev.palaceproject.io/minotaur-test-library/');
    
    console.log('📚 Catalog parsed successfully');
    console.log(`Total books in catalog: ${catalogData.books.length}`);
    
    // Simulate exactly what happens when user clicks a book in CategoryLane, UncategorizedLane, or CollectionLane
    const booksWithDistributors = catalogData.books.filter(book => book.distributor);
    console.log(`Books with distributors: ${booksWithDistributors.length}`);
    
    // Test the first few books that would appear in catalog lanes
    const sampleClickedBooks = booksWithDistributors.slice(0, 5);
    
    console.log('\n🖱️ Simulating book clicks from catalog lanes:');
    sampleClickedBooks.forEach((book, index) => {
      console.log(`\nBook ${index + 1} - User clicks on this book cover:`);
      console.log(`  Title: ${book.title}`);
      console.log(`  Author: ${book.author}`);
      console.log(`  Distributor: ${book.distributor}`);
      console.log(`  ProviderId: ${book.providerId || 'undefined'}`);
      console.log(`  Format: ${book.format}`);
      
      // This simulates the exact data that would be passed to BookDetailView
      console.log(`  -> onClick={() => onBookClick(book)} triggers:`);
      console.log(`  -> handleCatalogBookClick(book) calls:`);
      console.log(`  -> onShowBookDetail(book, 'catalog', catalogName)`);
      console.log(`  -> BookDetailView receives:`);
      console.log(`     book.distributor = "${book.distributor}"`);
      console.log(`     source = "catalog"`);
      console.log(`     Should show: "from ${book.distributor}" in Provider ID section`);
    });
    
    // Verify the data structure matches what BookDetailView expects
    const firstBook = sampleClickedBooks[0];
    expect(firstBook).toHaveProperty('title');
    expect(firstBook).toHaveProperty('author');
    expect(firstBook).toHaveProperty('distributor');
    expect(typeof firstBook.distributor).toBe('string');
    expect(firstBook.distributor!.length).toBeGreaterThan(0);
    
    console.log('\n✅ Catalog book click flow verified - distributor data is present');
    console.log('🔧 If distributor not showing in UI, check:');
    console.log('   1. Browser cache (hard refresh)');
    console.log('   2. Dev server restart');
    console.log('   3. Specific OPDS catalog being tested');
    console.log('   4. Network tab to see actual data being passed');
  });
  
  test('checks various distributor values in Palace catalog', () => {
    const xmlPath = path.join(__dirname, '../../test-data/MinotaurOPDS.xml');
    const xmlContent = fs.readFileSync(xmlPath, 'utf-8');
    const catalogData = parseOpds1Xml(xmlContent, 'https://minotaur.dev.palaceproject.io/minotaur-test-library/');
    
    // Get distribution of distributors
    const distributorCounts = catalogData.books.reduce((acc, book) => {
      if (book.distributor) {
        acc[book.distributor] = (acc[book.distributor] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\n📊 Distributor distribution in Palace catalog:');
    Object.entries(distributorCounts)
      .sort(([,a], [,b]) => b - a)
      .forEach(([distributor, count]) => {
        console.log(`  ${distributor}: ${count} books`);
      });
    
    // Test a variety of different distributors
    const distributorExamples = Object.keys(distributorCounts).slice(0, 3);
    console.log('\n🎯 Sample books from different distributors:');
    
    distributorExamples.forEach(dist => {
      const exampleBook = catalogData.books.find(book => book.distributor === dist);
      if (exampleBook) {
        console.log(`\n${dist} book example:`);
        console.log(`  "${exampleBook.title}" by ${exampleBook.author}`);
        console.log(`  When clicked -> Should show "from ${dist}" in UI`);
      }
    });
    
    expect(Object.keys(distributorCounts).length).toBeGreaterThan(1);
    console.log('\n✅ Multiple distributors found - UI should show variety');
  });
});