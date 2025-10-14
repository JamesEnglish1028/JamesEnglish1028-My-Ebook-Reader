import { describe, test, expect, beforeEach } from 'vitest';

import type { BookRecord } from '../../types';
import { db } from '../db';

describe('Database Distributor Persistence', () => {
  // Clean up before each test
  beforeEach(async () => {
    await db.clearAllBooks();
  });

  test('should preserve distributor information when saving and retrieving books', async () => {
    // Create a mock book record with distributor information
    const bookWithDistributor: BookRecord = {
      title: 'Test Book with Distributor',
      author: 'Test Author',
      coverImage: null,
      epubData: new ArrayBuffer(8), // Minimal epub data
      publisher: 'Test Publisher',
      publicationDate: '2024-01-01',
      distributor: 'OAPEN', // This should be preserved
      description: 'A test book to verify distributor persistence',
      subjects: ['Test', 'Fiction'],
      format: 'EPUB',
      providerId: 'test-123',
      providerName: 'Test Provider',
    };

    // Save the book
    const savedId = await db.saveBook(bookWithDistributor);
    expect(savedId).toBeGreaterThan(0);

    // Retrieve the book metadata
    const retrievedMetadata = await db.getBookMetadata(savedId);
    
    // Verify all fields including distributor are preserved
    expect(retrievedMetadata).not.toBeNull();
    expect(retrievedMetadata!.title).toBe('Test Book with Distributor');
    expect(retrievedMetadata!.author).toBe('Test Author');
    expect(retrievedMetadata!.distributor).toBe('OAPEN'); // This should now work!
    expect(retrievedMetadata!.publisher).toBe('Test Publisher');
    expect(retrievedMetadata!.description).toBe('A test book to verify distributor persistence');
  });

  test('should handle books without distributor information gracefully', async () => {
    // Create a book record without distributor
    const bookWithoutDistributor: BookRecord = {
      title: 'Test Book without Distributor',
      author: 'Test Author 2',
      coverImage: null,
      epubData: new ArrayBuffer(8),
      format: 'EPUB',
    };

    // Save the book
    const savedId = await db.saveBook(bookWithoutDistributor);
    
    // Retrieve the book metadata
    const retrievedMetadata = await db.getBookMetadata(savedId);
    
    // Verify distributor is undefined (not breaking anything)
    expect(retrievedMetadata).not.toBeNull();
    expect(retrievedMetadata!.distributor).toBeUndefined();
    expect(retrievedMetadata!.title).toBe('Test Book without Distributor');
  });

  test('should show distributor in getAllBooks results', async () => {
    // Save multiple books with different distributors
    const book1: BookRecord = {
      title: 'OAPEN Book',
      author: 'Author 1',
      coverImage: null,
      epubData: new ArrayBuffer(8),
      distributor: 'OAPEN',
      format: 'EPUB',
    };

    const book2: BookRecord = {
      title: 'BiblioBoard Book', 
      author: 'Author 2',
      coverImage: null,
      epubData: new ArrayBuffer(8),
      distributor: 'BiblioBoard',
      format: 'PDF',
    };

    await db.saveBook(book1);
    await db.saveBook(book2);

    // Get all books
    const allBooks = await db.getAllBooks();
    
    // Verify both books have their distributors preserved
    expect(allBooks).toHaveLength(2);
    
    const oapenBook = allBooks.find(book => book.title === 'OAPEN Book');
    const biblioBook = allBooks.find(book => book.title === 'BiblioBoard Book');
    
    expect(oapenBook?.distributor).toBe('OAPEN');
    expect(biblioBook?.distributor).toBe('BiblioBoard');
  });
});