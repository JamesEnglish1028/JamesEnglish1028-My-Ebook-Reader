import React from 'react';
import type { BookMetadata, CatalogBook } from '../../../types';

interface BookBadgesProps {
  book: BookMetadata | CatalogBook;
}

/**
 * BookBadges - Shared badge rendering for BookCard and BookDetailView
 */
const BookBadges: React.FC<BookBadgesProps> = ({ book }) => {
  // Type guard to check if book is from catalog
  const isCatalogBook = (b: BookMetadata | CatalogBook): b is CatalogBook => {
    return 'downloadUrl' in b;
  };

  // Get badge color based on format
  const getBadgeColor = (format: string) => {
    const upperFormat = format.toUpperCase();
    if (upperFormat === 'PDF') return 'bg-red-600';
    if (upperFormat === 'AUDIOBOOK') return 'bg-purple-600';
    return 'bg-sky-500';
  };

  // Format badges
  const formatBadges = (() => {
    if (isCatalogBook(book) && book.alternativeFormats && book.alternativeFormats.length > 0) {
      return book.alternativeFormats.map((fmt, idx) => ({
        key: `${book.title}-${fmt.format}-${idx}`,
        format: fmt.format,
        mediaType: fmt.mediaType,
      }));
    }
    if (book.format) {
      return [{
        key: `${book.title}-${book.format}`,
        format: book.format,
        mediaType: null,
      }];
    }
    return [];
  })();

  return (
    <div className="flex gap-1 flex-wrap">
      {/* Publication Type Badge (Schema.org) */}
      {isCatalogBook(book) && book.publicationTypeLabel && (
        <span
          className="inline-block text-xs font-bold px-2 py-0.5 rounded bg-green-700 text-white"
          title={`Publication Type: ${book.publicationTypeLabel}${book.schemaOrgType ? ' (' + book.schemaOrgType + ')' : ''}`}
        >
          {book.publicationTypeLabel}
        </span>
      )}
      {/* Format Badges */}
      {formatBadges.length > 0 && formatBadges.map((badge) => (
        <span
          key={badge.key}
          className={`inline-block text-white text-[10px] font-bold px-2 py-0.5 rounded ${getBadgeColor(badge.format)}`}
          title={badge.mediaType ? `Format: ${badge.format}, MediaType: ${badge.mediaType}` : `Format: ${badge.format}`}
        >
          {badge.format}
        </span>
      ))}
      {/* MediaType badge if present */}
      {book.mediaType && (
        <span className="inline-block text-xs font-mono bg-slate-700 text-sky-200 px-2 py-0.5 rounded" title={`Media Type: ${book.mediaType}`}> 
          {book.mediaType}
        </span>
      )}
      {/* AcquisitionMediaType badge if present and mediaType is missing */}
      {book.acquisitionMediaType && !book.mediaType && (
        <span className="inline-block text-xs font-mono bg-slate-700 text-sky-200 px-2 py-0.5 rounded" title={`Acquisition Media Type: ${book.acquisitionMediaType}`}> 
          {book.acquisitionMediaType}
        </span>
      )}
    </div>
  );
};

export default BookBadges;
