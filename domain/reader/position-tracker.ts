/**
 * Position Tracker Service
 *
 * Service layer for tracking and managing reading positions across books.
 * Handles CFI (Canonical Fragment Identifier) positions, page numbers,
 * reading progress, and text-to-speech positions.
 */

import { getStorageKey } from '../../constants';
import { logger } from '../../services/logger';
import type { ReadingPosition } from './types';

/**
 * Result type for position operations
 */
export type PositionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Location information including page and progress
 */
export interface LocationInfo {
  currentPage: number;
  totalPages: number;
  progress: number; // Percentage (0-100)
}

/**
 * Position update options
 */
export interface PositionUpdate {
  cfi: string;
  currentPage?: number;
  totalPages?: number;
  progress?: number;
}

/**
 * Position Tracker Service
 *
 * Manages reading positions for books, including:
 * - Last read position (CFI)
 * - Text-to-speech position
 * - Page numbers and progress tracking
 */
export class PositionTrackerService {
  /**
   * Get the last reading position for a book
   *
   * @param bookId - The ID of the book
   * @returns Result with CFI string or null if no position saved
   */
  getPosition(bookId: number): PositionResult<string | null> {
    try {
      logger.info('Getting position for book', { bookId });

      const key = getStorageKey.position(bookId);
      const cfi = localStorage.getItem(key);

      if (cfi) {
        logger.info('Found position', { bookId, cfi: cfi.substring(0, 50) + '...' });
      } else {
        logger.info('No position found', { bookId });
      }

      return { success: true, data: cfi };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error getting position';
      logger.error('Error getting position:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Save the current reading position for a book
   *
   * @param bookId - The ID of the book
   * @param cfi - The CFI (Canonical Fragment Identifier) position
   * @returns Result indicating success or failure
   */
  savePosition(bookId: number, cfi: string): PositionResult<void> {
    try {
      logger.info('Saving position for book', { bookId, cfi: cfi.substring(0, 50) + '...' });

      const key = getStorageKey.position(bookId);
      localStorage.setItem(key, cfi);

      logger.info('Position saved', { bookId });
      return { success: true, data: undefined };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error saving position';
      logger.error('Error saving position:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Clear the reading position for a book
   *
   * @param bookId - The ID of the book
   * @returns Result indicating success or failure
   */
  clearPosition(bookId: number): PositionResult<void> {
    try {
      logger.info('Clearing position for book', { bookId });

      const key = getStorageKey.position(bookId);
      localStorage.removeItem(key);

      logger.info('Position cleared', { bookId });
      return { success: true, data: undefined };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error clearing position';
      logger.error('Error clearing position:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Check if a book has a saved reading position
   *
   * @param bookId - The ID of the book
   * @returns Result with boolean indicating if position exists
   */
  hasPosition(bookId: number): PositionResult<boolean> {
    try {
      const result = this.getPosition(bookId);
      if (!result.success) {
        return { success: false, error: 'Failed to check position' };
      }

      return { success: true, data: result.data !== null };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error checking position';
      logger.error('Error checking position:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get the last reading position with metadata
   *
   * @param bookId - The ID of the book
   * @returns Result with ReadingPosition or null
   */
  getReadingPosition(bookId: number): PositionResult<ReadingPosition | null> {
    try {
      const result = this.getPosition(bookId);
      if (!result.success) {
        return { success: false, error: 'Failed to get reading position' };
      }

      if (!result.data) {
        return { success: true, data: null };
      }

      const position: ReadingPosition = {
        bookId,
        cfi: result.data,
        updatedAt: Date.now(),
      };

      return { success: true, data: position };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error getting reading position';
      logger.error('Error getting reading position:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  // ===== Text-to-Speech Position Tracking =====

  /**
   * Get the last text-to-speech position for a book
   *
   * @param bookId - The ID of the book
   * @returns Result with CFI string or null if no position saved
   */
  getSpeechPosition(bookId: number): PositionResult<string | null> {
    try {
      logger.info('Getting speech position for book', { bookId });

      const key = getStorageKey.spokenPosition(bookId);
      const cfi = localStorage.getItem(key);

      if (cfi) {
        logger.info('Found speech position', { bookId, cfi: cfi.substring(0, 50) + '...' });
      } else {
        logger.info('No speech position found', { bookId });
      }

      return { success: true, data: cfi };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error getting speech position';
      logger.error('Error getting speech position:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Save the current text-to-speech position for a book
   *
   * @param bookId - The ID of the book
   * @param cfi - The CFI position where speech stopped
   * @returns Result indicating success or failure
   */
  saveSpeechPosition(bookId: number, cfi: string): PositionResult<void> {
    try {
      logger.info('Saving speech position for book', { bookId, cfi: cfi.substring(0, 50) + '...' });

      const key = getStorageKey.spokenPosition(bookId);
      localStorage.setItem(key, cfi);

      logger.info('Speech position saved', { bookId });
      return { success: true, data: undefined };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error saving speech position';
      logger.error('Error saving speech position:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Clear the text-to-speech position for a book
   *
   * @param bookId - The ID of the book
   * @returns Result indicating success or failure
   */
  clearSpeechPosition(bookId: number): PositionResult<void> {
    try {
      logger.info('Clearing speech position for book', { bookId });

      const key = getStorageKey.spokenPosition(bookId);
      localStorage.removeItem(key);

      logger.info('Speech position cleared', { bookId });
      return { success: true, data: undefined };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error clearing speech position';
      logger.error('Error clearing speech position:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Clear all positions for a book (reading and speech)
   *
   * @param bookId - The ID of the book
   * @returns Result indicating success or failure
   */
  clearAllPositions(bookId: number): PositionResult<void> {
    try {
      logger.info('Clearing all positions for book', { bookId });

      const positionResult = this.clearPosition(bookId);
      const speechResult = this.clearSpeechPosition(bookId);

      if (!positionResult.success || !speechResult.success) {
        return { success: false, error: 'Failed to clear all positions' };
      }

      logger.info('All positions cleared', { bookId });
      return { success: true, data: undefined };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error clearing all positions';
      logger.error('Error clearing all positions:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  // ===== Progress Calculation Utilities =====

  /**
   * Calculate reading progress percentage from page numbers
   *
   * @param currentPage - Current page number (1-indexed)
   * @param totalPages - Total number of pages
   * @returns Progress percentage (0-100)
   */
  calculateProgress(currentPage: number, totalPages: number): number {
    if (totalPages === 0) return 0;
    const progress = (currentPage / totalPages) * 100;
    return Math.round(Math.max(0, Math.min(100, progress)));
  }

  /**
   * Create location info object
   *
   * @param currentPage - Current page number
   * @param totalPages - Total number of pages
   * @param progress - Optional progress percentage (calculated if not provided)
   * @returns LocationInfo object
   */
  createLocationInfo(
    currentPage: number,
    totalPages: number,
    progress?: number
  ): LocationInfo {
    const calculatedProgress = progress !== undefined
      ? progress
      : this.calculateProgress(currentPage, totalPages);

    return {
      currentPage,
      totalPages,
      progress: calculatedProgress,
    };
  }

  /**
   * Format location info as human-readable string
   *
   * @param location - Location information
   * @returns Formatted string like "Page 42 of 100 (42%)"
   */
  formatLocationInfo(location: LocationInfo): string {
    return `Page ${location.currentPage} of ${location.totalPages} (${location.progress}%)`;
  }

  /**
   * Format location for bookmark/citation label
   *
   * @param location - Location information
   * @returns Short formatted string like "Page 42"
   */
  formatPageLabel(location: LocationInfo): string {
    return `Page ${location.currentPage}`;
  }

  /**
   * Format location with progress for bookmark/citation label
   *
   * @param location - Location information
   * @returns Formatted string like "Page 42 (42%)"
   */
  formatPageWithProgress(location: LocationInfo): string {
    return `Page ${location.currentPage} (${location.progress}%)`;
  }

  // ===== Batch Operations =====

  /**
   * Get all book IDs that have saved positions
   *
   * @returns Result with array of book IDs
   */
  getAllBooksWithPositions(): PositionResult<number[]> {
    try {
      logger.info('Getting all books with positions');

      const bookIds: number[] = [];
      const prefix = 'reader_position_';

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          const bookIdStr = key.substring(prefix.length);
          const bookId = parseInt(bookIdStr, 10);
          if (!isNaN(bookId)) {
            bookIds.push(bookId);
          }
        }
      }

      logger.info('Found books with positions', { count: bookIds.length });
      return { success: true, data: bookIds };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error getting books with positions';
      logger.error('Error getting books with positions:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Export all positions for backup
   *
   * @returns Result with JSON string of all positions
   */
  exportAllPositions(): PositionResult<string> {
    try {
      logger.info('Exporting all positions');

      const booksResult = this.getAllBooksWithPositions();
      if (!booksResult.success) {
        return { success: false, error: 'Failed to export positions' };
      }

      const positions: Record<number, { position: string | null; speechPosition: string | null }> = {};

      for (const bookId of booksResult.data) {
        const posResult = this.getPosition(bookId);
        const speechResult = this.getSpeechPosition(bookId);

        if (posResult.success && speechResult.success) {
          positions[bookId] = {
            position: posResult.data,
            speechPosition: speechResult.data,
          };
        }
      }

      const json = JSON.stringify(positions, null, 2);
      logger.info('Positions exported', { bookCount: Object.keys(positions).length });
      return { success: true, data: json };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error exporting positions';
      logger.error('Error exporting positions:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Import positions from backup
   *
   * @param json - JSON string of positions
   * @param merge - If true, merge with existing positions; if false, replace
   * @returns Result with number of positions imported
   */
  importPositions(json: string, merge = false): PositionResult<number> {
    try {
      logger.info('Importing positions', { merge });

      const positions = JSON.parse(json) as Record<number, { position: string | null; speechPosition: string | null }>;

      if (typeof positions !== 'object' || positions === null) {
        return { success: false, error: 'Invalid positions data format' };
      }

      if (!merge) {
        // Clear existing positions if not merging
        const existingResult = this.getAllBooksWithPositions();
        if (existingResult.success) {
          for (const bookId of existingResult.data) {
            this.clearAllPositions(bookId);
          }
        }
      }

      let importedCount = 0;

      for (const [bookIdStr, data] of Object.entries(positions)) {
        const bookId = parseInt(bookIdStr, 10);
        if (isNaN(bookId)) continue;

        if (data.position) {
          this.savePosition(bookId, data.position);
          importedCount++;
        }

        if (data.speechPosition) {
          this.saveSpeechPosition(bookId, data.speechPosition);
        }
      }

      logger.info('Positions imported', { count: importedCount });
      return { success: true, data: importedCount };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error importing positions';
      logger.error('Error importing positions:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Clear all positions for all books
   * WARNING: This is a destructive operation
   *
   * @returns Result with number of positions cleared
   */
  clearAllBooksPositions(): PositionResult<number> {
    try {
      logger.warn('Clearing all positions for all books');

      const booksResult = this.getAllBooksWithPositions();
      if (!booksResult.success) {
        return { success: false, error: 'Failed to clear all positions' };
      }

      let clearedCount = 0;

      for (const bookId of booksResult.data) {
        const result = this.clearAllPositions(bookId);
        if (result.success) {
          clearedCount++;
        }
      }

      logger.info('All positions cleared', { count: clearedCount });
      return { success: true, data: clearedCount };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error clearing all positions';
      logger.error('Error clearing all positions:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }
}

// Singleton instance for convenience
export const positionTracker = new PositionTrackerService();
