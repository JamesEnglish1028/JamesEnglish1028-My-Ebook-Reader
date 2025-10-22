/**
 * Citation Service
 *
 * Service layer for managing citations (highlighted text with notes) and
 * generating formatted bibliographic citations in various academic styles.
 */

import { getStorageKey } from '../../constants';
import { logger } from '../../services/logger';
import type { BookMetadata } from '../book/types';

import type { Citation, CitationFormat, FormattedCitation } from './types';

/**
 * Result type for citation operations
 */
export type CitationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Options for creating a new citation
 */
export interface CreateCitationOptions {
  cfi: string;
  note: string;
  pageNumber?: number;
  chapter?: string;
  citationFormat: import('../types').CitationFormat;
}

/**
 * Options for updating an existing citation
 */
export interface UpdateCitationOptions {
  note?: string;
  pageNumber?: number;
  chapter?: string;
}

/**
 * Bibliographic citation components
 */
export interface CitationComponents {
  pre: string;      // Author and date prefix
  title: string;    // Book title
  post: string;     // Publisher and other info
  isItalic: boolean; // Whether title should be italicized
}

/**
 * Citation Service
 *
 * Manages citations (reader annotations) and provides bibliographic
 * citation formatting in APA, MLA, and Chicago styles.
 */
export class CitationService {
  /**
   * Safe JSON parsing with fallback
   */
  private safeParse<T>(value: string | null, fallback: T): T {
    if (!value) return fallback;
    try {
      return JSON.parse(value) as T;
    } catch (e) {
      logger.warn('Failed to parse citation JSON, using fallback', e);
      return fallback;
    }
  }

  /**
   * Get all citations for a specific book
   *
   * @param bookId - The ID of the book
   * @returns Result with array of citations (empty array if none found)
   */
  findByBookId(bookId: number): CitationResult<Citation[]> {
    try {
      logger.info('Finding citations for book', { bookId });

      const key = getStorageKey.citations(bookId);
      const saved = localStorage.getItem(key);
      const citations = this.safeParse<Citation[]>(saved, []);

      logger.info('Found citations', { bookId, count: citations.length });
      return { success: true, data: citations };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error finding citations';
      logger.error('Error finding citations:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get a specific citation by ID
   *
   * @param bookId - The ID of the book
   * @param citationId - The ID of the citation
   * @returns Result with citation or null if not found
   */
  findById(bookId: number, citationId: string): CitationResult<Citation | null> {
    try {
      const result = this.findByBookId(bookId);
      if (!result.success) {
        return { success: false, error: 'Failed to find citations' };
      }

      const citation = result.data.find(c => c.id === citationId);
      return { success: true, data: citation || null };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error finding citation';
      logger.error('Error finding citation by ID:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Add a new citation (annotation) for a book
   *
   * @param bookId - The ID of the book
   * @param options - Citation creation options
   * @returns Result with the created citation
   */
  add(bookId: number, options: CreateCitationOptions): CitationResult<Citation> {
    try {
      logger.info('Adding citation', { bookId, cfi: options.cfi });

      // Get existing citations
      const result = this.findByBookId(bookId);
      if (!result.success) {
        return { success: false, error: 'Failed to retrieve citations' };
      }

      // Create new citation
      const newCitation: Citation = {
        id: new Date().toISOString(),
        cfi: options.cfi,
        note: options.note,
        createdAt: Date.now(),
        pageNumber: options.pageNumber,
        chapter: options.chapter,
      };

      // Add to list and save
      const updatedCitations = [...result.data, newCitation];
      const saveResult = this.saveAll(bookId, updatedCitations);

      if (!saveResult.success) {
        return { success: false, error: 'Failed to save citation' };
      }

      logger.info('Citation added', { bookId, citationId: newCitation.id });
      return { success: true, data: newCitation };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error adding citation';
      logger.error('Error adding citation:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Update an existing citation
   *
   * @param bookId - The ID of the book
   * @param citationId - The ID of the citation to update
   * @param options - Updated citation properties
   * @returns Result with the updated citation
   */
  update(bookId: number, citationId: string, options: UpdateCitationOptions): CitationResult<Citation> {
    try {
      logger.info('Updating citation', { bookId, citationId });

      // Get existing citations
      const result = this.findByBookId(bookId);
      if (!result.success) {
        return { success: false, error: 'Failed to retrieve citations' };
      }

      // Find and update the citation
      const citations = result.data;
      const index = citations.findIndex(c => c.id === citationId);

      if (index === -1) {
        return { success: false, error: 'Citation not found' };
      }

      const updatedCitation: Citation = {
        ...citations[index],
        ...options,
      };

      citations[index] = updatedCitation;

      // Save updated list
      const saveResult = this.saveAll(bookId, citations);
      if (!saveResult.success) {
        return { success: false, error: 'Failed to save updated citation' };
      }

      logger.info('Citation updated', { bookId, citationId });
      return { success: true, data: updatedCitation };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error updating citation';
      logger.error('Error updating citation:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Delete a specific citation
   *
   * @param bookId - The ID of the book
   * @param citationId - The ID of the citation to delete
   * @returns Result indicating success or failure
   */
  delete(bookId: number, citationId: string): CitationResult<void> {
    try {
      logger.info('Deleting citation', { bookId, citationId });

      // Get existing citations
      const result = this.findByBookId(bookId);
      if (!result.success) {
        return { success: false, error: 'Failed to retrieve citations' };
      }

      // Filter out the citation to delete
      const updatedCitations = result.data.filter(c => c.id !== citationId);

      if (updatedCitations.length === result.data.length) {
        return { success: false, error: 'Citation not found' };
      }

      // Save updated list
      const saveResult = this.saveAll(bookId, updatedCitations);
      if (!saveResult.success) {
        return { success: false, error: 'Failed to save after deletion' };
      }

      logger.info('Citation deleted', { bookId, citationId });
      return { success: true, data: undefined };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error deleting citation';
      logger.error('Error deleting citation:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Delete all citations for a specific book
   *
   * @param bookId - The ID of the book
   * @returns Result indicating success or failure
   */
  deleteAll(bookId: number): CitationResult<void> {
    try {
      logger.warn('Deleting all citations for book', { bookId });

      const key = getStorageKey.citations(bookId);
      localStorage.removeItem(key);

      logger.info('All citations deleted', { bookId });
      return { success: true, data: undefined };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error deleting all citations';
      logger.error('Error deleting all citations:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Count citations for a specific book
   *
   * @param bookId - The ID of the book
   * @returns Result with citation count
   */
  count(bookId: number): CitationResult<number> {
    try {
      const result = this.findByBookId(bookId);
      if (!result.success) {
        return { success: false, error: 'Failed to count citations' };
      }

      return { success: true, data: result.data.length };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error counting citations';
      logger.error('Error counting citations:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Find citations by chapter
   *
   * @param bookId - The ID of the book
   * @param chapter - The chapter name to filter by
   * @returns Result with array of matching citations
   */
  findByChapter(bookId: number, chapter: string): CitationResult<Citation[]> {
    try {
      logger.info('Finding citations by chapter', { bookId, chapter });

      const result = this.findByBookId(bookId);
      if (!result.success) {
        return { success: false, error: 'Failed to find citations by chapter' };
      }

      const filtered = result.data.filter(c => c.chapter === chapter);

      logger.info('Found citations by chapter', { bookId, chapter, count: filtered.length });
      return { success: true, data: filtered };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error finding citations by chapter';
      logger.error('Error finding citations by chapter:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get citations sorted by creation date (newest first)
   *
   * @param bookId - The ID of the book
   * @returns Result with sorted array of citations
   */
  findSortedByDate(bookId: number): CitationResult<Citation[]> {
    try {
      const result = this.findByBookId(bookId);
      if (!result.success) {
        return { success: false, error: 'Failed to sort citations' };
      }

      const sorted = [...result.data].sort((a, b) => b.createdAt - a.createdAt);
      return { success: true, data: sorted };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error sorting citations';
      logger.error('Error sorting citations:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Save all citations for a book (internal method)
   *
   * @param bookId - The ID of the book
   * @param citations - Array of citations to save
   * @returns Result indicating success or failure
   */
  private saveAll(bookId: number, citations: Citation[]): CitationResult<void> {
    try {
      const key = getStorageKey.citations(bookId);
      localStorage.setItem(key, JSON.stringify(citations));
      return { success: true, data: undefined };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error saving citations';
      logger.error('Error saving citations:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  // ===== Bibliographic Citation Formatting =====

  /**
   * Extract publication year from date string
   */
  private getPublicationYear(dateStr: string | undefined): string {
    if (!dateStr) return 'n.d.';
    const match = dateStr.match(/\d{4}/);
    return match ? match[0] : 'n.d.';
  }

  /**
   * Format author name for citations
   *
   * @param authorName - Full author name
   * @param format - Citation format
   * @returns Formatted author name
   */
  formatAuthorName(authorName: string, format: CitationFormat): string {
    const words = authorName.split(' ').filter(p => p.trim());
    if (words.length < 2) return authorName;

    const lastName = words.pop()!;
    const firstNameParts = words;

    if (format === 'apa') {
      const initials = firstNameParts.map(name => (name[0] ? `${name[0]}.` : '')).join(' ');
      return `${lastName}, ${initials}`;
    }

    return `${lastName}, ${firstNameParts.join(' ')}`;
  }

  /**
   * Generate bibliographic citation components
   *
   * @param book - Book metadata
   * @param format - Citation format (APA, MLA, or Chicago)
   * @returns Citation components for rendering
   */
  generateCitation(book: BookMetadata, format: CitationFormat): CitationComponents {
    try {
      const author = book.author || 'Unknown Author';
      const title = book.title || 'Untitled Book';
      const publisher = book.publisher || '[Publisher not available]';
      const year = this.getPublicationYear(book.publicationDate);
      const formattedAuthor = this.formatAuthorName(author, format);

      switch (format) {
        case 'apa':
          return {
            pre: `${formattedAuthor} (${year}). `,
            title,
            post: `. ${publisher}.`,
            isItalic: true,
          };

        case 'mla':
          return {
            pre: `${formattedAuthor}. `,
            title,
            post: `. ${publisher}, ${year === 'n.d.' ? '[Date not available]' : year}.`,
            isItalic: true,
          };

        case 'chicago':
          return {
            pre: `${formattedAuthor}. `,
            title,
            post: `. ${publisher}, ${year === 'n.d.' ? '[Date not available]' : year}.`,
            isItalic: false,
          };

        default:
          return {
            pre: `${author}. `,
            title,
            post: `.`,
            isItalic: false,
          };
      }
    } catch (error) {
      logger.error('Error generating citation:', error);
      return {
        pre: '',
        title: book.title || 'Untitled Book',
        post: '',
        isItalic: false,
      };
    }
  }

  /**
   * Generate formatted citation as plain text
   *
   * @param book - Book metadata
   * @param format - Citation format
   * @returns Formatted citation object
   */
  formatCitation(book: BookMetadata, format: CitationFormat): FormattedCitation {
    const components = this.generateCitation(book, format);
    const text = `${components.pre}${components.title}${components.post}`;

    return {
      format,
      text,
    };
  }

  /**
   * Generate all citation formats for a book
   *
   * @param book - Book metadata
   * @returns Array of formatted citations in all supported formats
   */
  formatAllStyles(book: BookMetadata): FormattedCitation[] {
    const formats: CitationFormat[] = ['apa', 'mla', 'chicago'];
    return formats.map(format => this.formatCitation(book, format));
  }

  /**
   * Generate RIS format export for citations
   * RIS is a standardized format for bibliographic data
   *
   * @param book - Book metadata
   * @param citations - Array of citations to export
   * @returns RIS formatted string
   */
  exportToRIS(book: BookMetadata, citations: Citation[]): CitationResult<string> {
    try {
      logger.info('Exporting citations to RIS', { bookId: book.id, count: citations.length });

      const allRecords: string[] = [];
      const year = this.getPublicationYear(book.publicationDate);

      citations.forEach(citation => {
        const risRecord: string[] = [];
        risRecord.push('TY  - CHAP'); // Chapter of a book

        if (book.author) {
          const formattedAuthor = this.formatAuthorName(book.author, 'apa');
          risRecord.push(`AU  - ${formattedAuthor}`);
        }

        if (book.title) risRecord.push(`T2  - ${book.title}`);
        if (book.publisher) risRecord.push(`PB  - ${book.publisher}`);
        if (year !== 'n.d.') risRecord.push(`PY  - ${year}`);
        if (book.isbn) risRecord.push(`SN  - ${book.isbn}`);
        if (citation.chapter) risRecord.push(`TI  - ${citation.chapter}`);
        if (citation.pageNumber) risRecord.push(`SP  - ${citation.pageNumber}`);

        // Clean note content (remove line breaks)
        const noteContent = (citation.note || '').replace(/(\r\n|\n|\r)/gm, ' ');
        if (noteContent) risRecord.push(`N1  - ${noteContent}`);

        risRecord.push('ER  - '); // End of record
        allRecords.push(risRecord.join('\r\n'));
      });

      const risContent = allRecords.join('\r\n\r\n') + '\r\n';

      logger.info('RIS export successful', { recordCount: allRecords.length });
      return { success: true, data: risContent };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error exporting to RIS';
      logger.error('Error exporting to RIS:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Export citations as JSON
   *
   * @param bookId - The ID of the book
   * @returns Result with JSON string of citations
   */
  exportCitations(bookId: number): CitationResult<string> {
    try {
      const result = this.findByBookId(bookId);
      if (!result.success) {
        return { success: false, error: 'Failed to export citations' };
      }

      const json = JSON.stringify(result.data, null, 2);
      logger.info('Citations exported', { bookId, count: result.data.length });
      return { success: true, data: json };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error exporting citations';
      logger.error('Error exporting citations:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Import citations from JSON
   *
   * @param bookId - The ID of the book
   * @param json - JSON string of citations to import
   * @param merge - If true, merge with existing citations; if false, replace
   * @returns Result with number of citations imported
   */
  importCitations(bookId: number, json: string, merge = false): CitationResult<number> {
    try {
      logger.info('Importing citations', { bookId, merge });

      const imported = this.safeParse<Citation[]>(json, []);

      if (!Array.isArray(imported)) {
        return { success: false, error: 'Invalid citation data format' };
      }

      let finalCitations = imported;

      if (merge) {
        const existingResult = this.findByBookId(bookId);
        if (!existingResult.success) {
          return { success: false, error: 'Failed to merge citations' };
        }

        // Merge, avoiding duplicates by ID
        const existingIds = new Set(existingResult.data.map(c => c.id));
        const newCitations = imported.filter(c => !existingIds.has(c.id));
        finalCitations = [...existingResult.data, ...newCitations];
      }

      const saveResult = this.saveAll(bookId, finalCitations);
      if (!saveResult.success) {
        return { success: false, error: 'Failed to save imported citations' };
      }

      logger.info('Citations imported', { bookId, count: imported.length, totalCount: finalCitations.length });
      return { success: true, data: imported.length };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error importing citations';
      logger.error('Error importing citations:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }
}

// Singleton instance for convenience
export const citationService = new CitationService();
