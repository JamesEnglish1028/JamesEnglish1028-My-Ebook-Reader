/**
 * Reader Domain Types
 *
 * This module defines all types related to the reading experience,
 * including settings, bookmarks, citations, and navigation.
 */

/**
 * Reader visual and behavior settings
 */
export interface ReaderSettings {
  fontSize: number;
  theme: 'light' | 'dark';
  flow: 'paginated' | 'scrolled';
  fontFamily: string;
  citationFormat: 'apa' | 'mla' | 'chicago';
  readAloud: ReadAloudSettings;
}

/**
 * Text-to-speech settings
 */
export interface ReadAloudSettings {
  voiceURI: string | null;
  rate: number;
  pitch: number;
  volume: number;
}

/**
 * Table of contents item (recursive structure)
 */
export interface TocItem {
  id: string;
  href: string;
  label: string;
  subitems?: TocItem[];
}

/**
 * Bookmark - saved reading position
 */
export interface Bookmark {
  id: string;
  cfi: string; // Canonical Fragment Identifier (EPUB position)
  label: string;
  chapter?: string;
  description?: string;
  createdAt: number; // Unix timestamp
}

/**
 * Citation - highlighted text with user notes
 */
export interface Citation {
  id: string;
  cfi: string; // Position in the book
  note: string; // User's annotation
  createdAt: number; // Unix timestamp
  pageNumber?: number;
  chapter?: string;
}

/**
 * Search result within a book
 */
export interface SearchResult {
  cfi: string;
  excerpt: string;
}

/**
 * Cover animation metadata for page transitions
 */
export interface CoverAnimationData {
  rect: DOMRect;
  coverImage: string | null;
}

/**
 * Reading position state
 */
export interface ReadingPosition {
  bookId: number;
  cfi: string | null;
  updatedAt: number;
}

/**
 * Citation formatting options
 */
export type CitationFormat = 'apa' | 'mla' | 'chicago';

/**
 * Citation style output
 */
export interface FormattedCitation {
  format: CitationFormat;
  text: string;
}
