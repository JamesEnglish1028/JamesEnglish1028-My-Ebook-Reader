import type { CatalogBook } from '../catalog/types';

import type { BookMetadata, BookRecord } from './types';

// Convert CatalogBook to BookRecord for saving to DB
export function catalogBookToBookRecord(catalogBook: CatalogBook, epubData: ArrayBuffer): BookRecord {
  return {
    title: catalogBook.title,
    author: catalogBook.author,
    coverImage: catalogBook.coverImage,
    epubData,
    publisher: catalogBook.publisher,
    publicationDate: catalogBook.publicationDate,
    providerId: catalogBook.providerId,
    sourceName: catalogBook.sourceName,
    description: catalogBook.description ?? undefined,
    subjects: catalogBook.subjects,
    format: catalogBook.format,
    // Add any additional OPF/accessibility fields if available
  };
}

// Convert BookRecord to BookMetadata for display
export function bookRecordToBookMetadata(book: BookRecord): BookMetadata {
  return {
    id: book.id ?? 0,
    title: book.title,
    author: book.author,
    coverImage: book.coverImage,
    publisher: book.publisher,
    publicationDate: book.publicationDate,
    providerId: book.providerId,
    sourceName: book.sourceName,
    description: book.description,
    subjects: book.subjects,
    format: book.format,
    isbn: book.isbn,
    language: book.language,
    rights: book.rights,
    identifiers: book.identifiers,
    opfRaw: book.opfRaw,
    accessModes: book.accessModes,
    accessModesSufficient: book.accessModesSufficient,
    accessibilityFeatures: book.accessibilityFeatures,
    hazards: book.hazards,
    accessibilitySummary: book.accessibilitySummary,
    certificationConformsTo: book.certificationConformsTo,
    certification: book.certification,
    accessibilityFeedback: book.accessibilityFeedback,
  };
}

// Convert CatalogBook to BookMetadata for preview (no epubData)
export function catalogBookToBookMetadata(catalogBook: CatalogBook): BookMetadata {
  return {
    id: 0,
    title: catalogBook.title,
    author: catalogBook.author,
    coverImage: catalogBook.coverImage,
    publisher: catalogBook.publisher,
    publicationDate: catalogBook.publicationDate,
    providerId: catalogBook.providerId,
    sourceName: catalogBook.sourceName,
    description: catalogBook.description ?? undefined,
    subjects: catalogBook.subjects,
    format: catalogBook.format,
    // Other fields left undefined
  };
}
