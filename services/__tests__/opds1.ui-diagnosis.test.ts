import { readFileSync } from 'fs';
import { resolve } from 'path';

/* global __dirname */

import { describe, test, expect } from 'vitest';

import { parseOpds1Xml } from '../opds';

describe('Palace.io OPDS 1 UI State Diagnosis', () => {
  test('verifies collection availability detection for UI dropdown', () => {
    // Read the real Minotaur test data
    const xmlPath = resolve(__dirname, '../../test-data/MinotaurOPDS.xml');
    const xmlData = readFileSync(xmlPath, 'utf-8');
    
    const { books } = parseOpds1Xml(xmlData, 'https://minotaur.dev.palaceproject.io/minotaur-test-library/');
    
    // Simulate the exact logic used in Library.tsx for hasAvailableCollections
    const hasCollections = books.some(book => book.collections && book.collections.length > 0);
    
    console.log('Total books parsed:', books.length);
    console.log('Books with collections:', books.filter(b => b.collections && b.collections.length > 0).length);
    console.log('hasCollections (should be true):', hasCollections);
    
    // This should be true for "By Collection" to be available
    expect(hasCollections).toBe(true);
    
    // Check if the issue might be with the dropdown appearing as "(not available)"
    // This would happen if hasCollections is false OR if there's a UI bug
    
    // Log some sample books with their collection data
    const sampleBooksWithCollections = books
      .filter(book => book.collections && book.collections.length > 0)
      .slice(0, 3)
      .map(book => ({
        title: book.title,
        collections: book.collections,
      }));
    
    console.log('Sample books with collections:', JSON.stringify(sampleBooksWithCollections, null, 2));
  });

  test('checks if OPDS 2 format detection might be interfering', () => {
    // The user mentioned "It appears the UI is expecting OPDS 2 JSON"
    // Let's check if there's any JSON-specific logic that might be interfering
    
    const xmlPath = resolve(__dirname, '../../test-data/MinotaurOPDS.xml');
    const xmlData = readFileSync(xmlPath, 'utf-8');
    
    // Verify this is definitely XML, not JSON
    expect(xmlData.trim().startsWith('<feed')).toBe(true);
    expect(xmlData.includes('<feed')).toBe(true);
    expect(xmlData.includes('xmlns="http://www.w3.org/2005/Atom"')).toBe(true);
    
    // Parse successfully as OPDS 1
    const { books, navLinks } = parseOpds1Xml(xmlData, 'https://minotaur.dev.palaceproject.io/minotaur-test-library/');
    
    expect(books.length).toBeGreaterThan(0);
    
    console.log('Successfully parsed as OPDS 1 XML');
    console.log('Books found:', books.length);
    console.log('Nav links found:', navLinks.length);
  });
});