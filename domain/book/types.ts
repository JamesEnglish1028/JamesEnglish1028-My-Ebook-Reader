/**
 * Book Domain Types
 *
 * This module defines all types related to books in the user's library.
 * Books in this domain are "owned" - they exist in the user's collection.
 */

/**
 * Book format enumeration
 */
export type BookFormat = 'EPUB' | 'PDF' | string;

/**
 * Book metadata - represents a book in the user's library.
 * This is the "view" of a book without the binary data.
 */
export interface BookMetadata {
  id: number;
  title: string;
  author: string;
  coverImage: string | null; // Base64 encoded image
  publisher?: string;
  publicationDate?: string;
  isbn?: string; // Kept for backwards compatibility
  providerId?: string; // ID from the originating catalog
  providerName?: string; // Name of the catalog/provider
  distributor?: string; // Distribution provider (e.g., OAPEN, BiblioBoard)
  description?: string;
  subjects?: string[];
  format?: BookFormat;
}

/**
 * Complete book record including binary data.
 * Used for storage operations in IndexedDB.
 */
export interface BookRecord {
  id?: number; // Optional for new books not yet saved
  title: string;
  author: string;
  coverImage: string | null;
  epubData: ArrayBuffer; // The actual book content
  publisher?: string;
  publicationDate?: string;
  isbn?: string;
  providerId?: string;
  providerName?: string;
  distributor?: string;
  description?: string;
  subjects?: string[];
  format?: BookFormat;
}

/**
 * Book query filters for repository operations
 */
export interface BookQueryFilters {
  author?: string;
  title?: string;
  providerId?: string;
  format?: BookFormat;
}

/**
 * Book sort options
 */
export type BookSortField = 'title' | 'author' | 'publicationDate' | 'id';
export type BookSortOrder = 'asc' | 'desc';

export interface BookSortOptions {
  field: BookSortField;
  order: BookSortOrder;
}
