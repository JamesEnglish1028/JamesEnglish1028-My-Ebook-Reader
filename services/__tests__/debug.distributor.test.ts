import { readFileSync } from 'fs';
import { resolve } from 'path';

/* global __dirname */

import { describe, it, expect } from 'vitest';

import { parseOpds1Xml } from '../opds';

describe('Distributor Debug Test', () => {
  it('debugs distributor parsing from MinotaurOPDS.xml', () => {
    const xmlPath = resolve(__dirname, '../../test-data/MinotaurOPDS.xml');
    const xmlData = readFileSync(xmlPath, 'utf-8');
    
    // Parse the actual data
    const { books } = parseOpds1Xml(xmlData, 'https://minotaur.dev.palaceproject.io/minotaur-test-library/');
    
    // Get first 3 books and log their details
    const sampleBooks = books.slice(0, 3);
    console.log('Sample books parsed:');
    sampleBooks.forEach((book, index) => {
      console.log(`Book ${index + 1}:`);
      console.log(`  Title: ${book.title}`);
      console.log(`  Author: ${book.author}`);
      console.log(`  Publisher: ${book.publisher || 'undefined'}`);
      console.log(`  Distributor: ${book.distributor || 'undefined'}`);
      console.log(`  Format: ${book.format || 'undefined'}`);
      console.log('---');
    });
    
    // Find specific distributors
    const oapenBooks = books.filter(book => book.distributor === 'OAPEN');
    const biblioBoardBooks = books.filter(book => book.distributor === 'BiblioBoard');
    
    console.log(`Found ${oapenBooks.length} OAPEN books`);
    console.log(`Found ${biblioBoardBooks.length} BiblioBoard books`);
    
    // Log a sample of XML to see the structure
    const firstEntry = xmlData.match(/<entry[^>]*>[\s\S]*?<\/entry>/);
    if (firstEntry) {
      console.log('First entry XML snippet:');
      console.log(firstEntry[0].substring(0, 800));
    }
    
    expect(books.length).toBeGreaterThan(0);
    expect(oapenBooks.length).toBeGreaterThan(0);
  });
});