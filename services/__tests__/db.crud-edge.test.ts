import { beforeEach, describe, expect, it } from 'vitest';

import { db } from '../db';

describe('db.ts - error paths, edge cases, CRUD', () => {
  beforeEach(async () => {
    await db.clearAllBooks();
  });

  it('saves and retrieves a book (basic CRUD)', async () => {
    const book = { title: 'A', author: 'B', coverImage: null, epubData: new ArrayBuffer(1), format: 'EPUB' };
    const id = await db.saveBook(book as any);
    expect(typeof id).toBe('number');
    const loaded = await db.getBook(id);
    expect(loaded?.title).toBe('A');
  });

  it('updates a book', async () => {
    const book = { title: 'A', author: 'B', coverImage: null, epubData: new ArrayBuffer(1), format: 'EPUB' };
    const id = await db.saveBook(book as any);
    const updated = { ...book, title: 'C', id };
    await db.saveBook(updated as any);
    const loaded = await db.getBook(id);
    expect(loaded?.title).toBe('C');
  });

  it('deletes a book', async () => {
    const book = { title: 'A', author: 'B', coverImage: null, epubData: new ArrayBuffer(1), format: 'EPUB' };
    const id = await db.saveBook(book as any);
    await db.deleteBook(id);
    const loaded = await db.getBook(id);
    expect(loaded).toBeUndefined();
  });

  it('handles getBookMetadata for missing id', async () => {
    const meta = await db.getBookMetadata(999999);
    expect(meta).toBeNull();
  });

  it('findBookByIdentifier returns null for missing', async () => {
    const found = await db.findBookByIdentifier('notfound');
    expect(found).toBeNull();
  });

  it('handles error when IndexedDB is unavailable', async () => {
  // Clear dbInstance cache and simulate IndexedDB failure
  // @ts-ignore
  db.dbInstance = null;
    const orig = window.indexedDB;
    // @ts-ignore
    delete window.indexedDB;
    try {
      await expect(db.saveBook({ title: 'fail', author: 'fail', coverImage: null, epubData: new ArrayBuffer(1), format: 'EPUB' } as any)).rejects.toBeDefined();
    } finally {
      window.indexedDB = orig;
    }
  });
});
