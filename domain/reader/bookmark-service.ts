/**
 * Bookmark Service
 *
 * Service layer for managing bookmarks across books.
 * Handles storage, retrieval, and manipulation of bookmark data.
 */

import { getStorageKey } from '../../constants';
import { logger } from '../../services/logger';

import type { Bookmark } from './types';

/**
 * Result type for bookmark operations
 */
export type BookmarkResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Options for creating a new bookmark
 */
export interface CreateBookmarkOptions {
  cfi: string;
  label?: string;
  chapter?: string;
  description?: string;
}

/**
 * Options for updating an existing bookmark
 */
export interface UpdateBookmarkOptions {
  label?: string;
  chapter?: string;
  description?: string;
}

/**
 * Bookmark Service
 *
 * Provides centralized bookmark management functionality.
 * Uses localStorage for persistence (matches existing implementation).
 */
export class BookmarkService {
  /**
   * Safe JSON parsing with fallback
   */
  private safeParse<T>(value: string | null, fallback: T): T {
    if (!value) return fallback;
    try {
      return JSON.parse(value) as T;
    } catch (e) {
      logger.warn('Failed to parse bookmark JSON, using fallback', e);
      return fallback;
    }
  }

  /**
   * Get all bookmarks for a specific book
   *
   * @param bookId - The ID of the book
   * @returns Result with array of bookmarks (empty array if none found)
   */
  findByBookId(bookId: number): BookmarkResult<Bookmark[]> {
    try {
      logger.info('Finding bookmarks for book', { bookId });

      const key = getStorageKey.bookmarks(bookId);
      const saved = localStorage.getItem(key);
      const bookmarks = this.safeParse<Bookmark[]>(saved, []);

      logger.info('Found bookmarks', { bookId, count: bookmarks.length });
      return { success: true, data: bookmarks };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error finding bookmarks';
      logger.error('Error finding bookmarks:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get a specific bookmark by ID
   *
   * @param bookId - The ID of the book
   * @param bookmarkId - The ID of the bookmark
   * @returns Result with bookmark or null if not found
   */
  findById(bookId: number, bookmarkId: string): BookmarkResult<Bookmark | null> {
    try {
      const result = this.findByBookId(bookId);
      if (!result.success) {
        return { success: false, error: 'Failed to find bookmarks' };
      }

      const bookmark = result.data.find(b => b.id === bookmarkId);
      return { success: true, data: bookmark || null };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error finding bookmark';
      logger.error('Error finding bookmark by ID:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Add a new bookmark for a book
   *
   * @param bookId - The ID of the book
   * @param options - Bookmark creation options
   * @returns Result with the created bookmark
   */
  add(bookId: number, options: CreateBookmarkOptions): BookmarkResult<Bookmark> {
    try {
      logger.info('Adding bookmark', { bookId, cfi: options.cfi });

      // Get existing bookmarks
      const result = this.findByBookId(bookId);
      if (!result.success) {
        return { success: false, error: 'Failed to retrieve bookmarks' };
      }

      // Create new bookmark
      const newBookmark: Bookmark = {
        id: new Date().toISOString(),
        cfi: options.cfi,
        label: options.label || 'Bookmark',
        chapter: options.chapter,
        description: options.description,
        createdAt: Date.now(),
      };

      // Add to list and save
      const updatedBookmarks = [...result.data, newBookmark];
      const saveResult = this.saveAll(bookId, updatedBookmarks);

      if (!saveResult.success) {
        return { success: false, error: 'Failed to save bookmark' };
      }

      logger.info('Bookmark added', { bookId, bookmarkId: newBookmark.id });
      return { success: true, data: newBookmark };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error adding bookmark';
      logger.error('Error adding bookmark:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Update an existing bookmark
   *
   * @param bookId - The ID of the book
   * @param bookmarkId - The ID of the bookmark to update
   * @param options - Updated bookmark properties
   * @returns Result with the updated bookmark
   */
  update(bookId: number, bookmarkId: string, options: UpdateBookmarkOptions): BookmarkResult<Bookmark> {
    try {
      logger.info('Updating bookmark', { bookId, bookmarkId });

      // Get existing bookmarks
      const result = this.findByBookId(bookId);
      if (!result.success) {
        return { success: false, error: 'Failed to retrieve bookmarks' };
      }

      // Find and update the bookmark
      const bookmarks = result.data;
      const index = bookmarks.findIndex(b => b.id === bookmarkId);

      if (index === -1) {
        return { success: false, error: 'Bookmark not found' };
      }

      const updatedBookmark: Bookmark = {
        ...bookmarks[index],
        ...options,
      };

      bookmarks[index] = updatedBookmark;

      // Save updated list
      const saveResult = this.saveAll(bookId, bookmarks);
      if (!saveResult.success) {
        return { success: false, error: 'Failed to save updated bookmark' };
      }

      logger.info('Bookmark updated', { bookId, bookmarkId });
      return { success: true, data: updatedBookmark };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error updating bookmark';
      logger.error('Error updating bookmark:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Delete a specific bookmark
   *
   * @param bookId - The ID of the book
   * @param bookmarkId - The ID of the bookmark to delete
   * @returns Result indicating success or failure
   */
  delete(bookId: number, bookmarkId: string): BookmarkResult<void> {
    try {
      logger.info('Deleting bookmark', { bookId, bookmarkId });

      // Get existing bookmarks
      const result = this.findByBookId(bookId);
      if (!result.success) {
        return { success: false, error: 'Failed to retrieve bookmarks' };
      }

      // Filter out the bookmark to delete
      const updatedBookmarks = result.data.filter(b => b.id !== bookmarkId);

      if (updatedBookmarks.length === result.data.length) {
        return { success: false, error: 'Bookmark not found' };
      }

      // Save updated list
      const saveResult = this.saveAll(bookId, updatedBookmarks);
      if (!saveResult.success) {
        return { success: false, error: 'Failed to save after deletion' };
      }

      logger.info('Bookmark deleted', { bookId, bookmarkId });
      return { success: true, data: undefined };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error deleting bookmark';
      logger.error('Error deleting bookmark:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Delete all bookmarks for a specific book
   *
   * @param bookId - The ID of the book
   * @returns Result indicating success or failure
   */
  deleteAll(bookId: number): BookmarkResult<void> {
    try {
      logger.warn('Deleting all bookmarks for book', { bookId });

      const key = getStorageKey.bookmarks(bookId);
      localStorage.removeItem(key);

      logger.info('All bookmarks deleted', { bookId });
      return { success: true, data: undefined };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error deleting all bookmarks';
      logger.error('Error deleting all bookmarks:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Count bookmarks for a specific book
   *
   * @param bookId - The ID of the book
   * @returns Result with bookmark count
   */
  count(bookId: number): BookmarkResult<number> {
    try {
      const result = this.findByBookId(bookId);
      if (!result.success) {
        return { success: false, error: 'Failed to count bookmarks' };
      }

      return { success: true, data: result.data.length };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error counting bookmarks';
      logger.error('Error counting bookmarks:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Check if a bookmark exists at a specific CFI
   *
   * @param bookId - The ID of the book
   * @param cfi - The CFI to check
   * @returns Result with boolean indicating if bookmark exists
   */
  existsAtCfi(bookId: number, cfi: string): BookmarkResult<boolean> {
    try {
      const result = this.findByBookId(bookId);
      if (!result.success) {
        return { success: false, error: 'Failed to check bookmark existence' };
      }

      const exists = result.data.some(b => b.cfi === cfi);
      return { success: true, data: exists };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error checking bookmark existence';
      logger.error('Error checking bookmark existence:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Find bookmarks by chapter
   *
   * @param bookId - The ID of the book
   * @param chapter - The chapter name to filter by
   * @returns Result with array of matching bookmarks
   */
  findByChapter(bookId: number, chapter: string): BookmarkResult<Bookmark[]> {
    try {
      logger.info('Finding bookmarks by chapter', { bookId, chapter });

      const result = this.findByBookId(bookId);
      if (!result.success) {
        return { success: false, error: 'Failed to find bookmarks by chapter' };
      }

      const filtered = result.data.filter(b => b.chapter === chapter);

      logger.info('Found bookmarks by chapter', { bookId, chapter, count: filtered.length });
      return { success: true, data: filtered };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error finding bookmarks by chapter';
      logger.error('Error finding bookmarks by chapter:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get bookmarks sorted by creation date (newest first)
   *
   * @param bookId - The ID of the book
   * @returns Result with sorted array of bookmarks
   */
  findSortedByDate(bookId: number): BookmarkResult<Bookmark[]> {
    try {
      const result = this.findByBookId(bookId);
      if (!result.success) {
        return { success: false, error: 'Failed to sort bookmarks' };
      }

      const sorted = [...result.data].sort((a, b) => b.createdAt - a.createdAt);
      return { success: true, data: sorted };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error sorting bookmarks';
      logger.error('Error sorting bookmarks:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Save all bookmarks for a book (internal method)
   *
   * @param bookId - The ID of the book
   * @param bookmarks - Array of bookmarks to save
   * @returns Result indicating success or failure
   */
  private saveAll(bookId: number, bookmarks: Bookmark[]): BookmarkResult<void> {
    try {
      const key = getStorageKey.bookmarks(bookId);
      localStorage.setItem(key, JSON.stringify(bookmarks));
      return { success: true, data: undefined };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error saving bookmarks';
      logger.error('Error saving bookmarks:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Export bookmarks for a book (for backup/export features)
   *
   * @param bookId - The ID of the book
   * @returns Result with JSON string of bookmarks
   */
  exportBookmarks(bookId: number): BookmarkResult<string> {
    try {
      const result = this.findByBookId(bookId);
      if (!result.success) {
        return { success: false, error: 'Failed to export bookmarks' };
      }

      const json = JSON.stringify(result.data, null, 2);
      logger.info('Bookmarks exported', { bookId, count: result.data.length });
      return { success: true, data: json };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error exporting bookmarks';
      logger.error('Error exporting bookmarks:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Import bookmarks for a book (for backup/import features)
   *
   * @param bookId - The ID of the book
   * @param json - JSON string of bookmarks to import
   * @param merge - If true, merge with existing bookmarks; if false, replace
   * @returns Result with number of bookmarks imported
   */
  importBookmarks(bookId: number, json: string, merge = false): BookmarkResult<number> {
    try {
      logger.info('Importing bookmarks', { bookId, merge });

      const imported = this.safeParse<Bookmark[]>(json, []);

      if (!Array.isArray(imported)) {
        return { success: false, error: 'Invalid bookmark data format' };
      }

      let finalBookmarks = imported;

      if (merge) {
        const existingResult = this.findByBookId(bookId);
        if (!existingResult.success) {
          return { success: false, error: 'Failed to merge bookmarks' };
        }

        // Merge, avoiding duplicates by ID
        const existingIds = new Set(existingResult.data.map(b => b.id));
        const newBookmarks = imported.filter(b => !existingIds.has(b.id));
        finalBookmarks = [...existingResult.data, ...newBookmarks];
      }

      const saveResult = this.saveAll(bookId, finalBookmarks);
      if (!saveResult.success) {
        return { success: false, error: 'Failed to save imported bookmarks' };
      }

      logger.info('Bookmarks imported', { bookId, count: imported.length, totalCount: finalBookmarks.length });
      return { success: true, data: imported.length };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error importing bookmarks';
      logger.error('Error importing bookmarks:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }
}

// Singleton instance for convenience
export const bookmarkService = new BookmarkService();
