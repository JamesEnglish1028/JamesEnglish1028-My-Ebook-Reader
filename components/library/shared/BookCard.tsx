import React from 'react';
import type { BookMetadata, CatalogBook } from '../../../types';
import { proxiedUrl } from '../../../services/utils';

interface BookCardProps {
  book: BookMetadata | CatalogBook;
  onClick: (book: BookMetadata | CatalogBook) => void;
  onContextMenu?: (book: BookMetadata | CatalogBook, e: React.MouseEvent) => void;
  className?: string;
}

/**
 * BookCard - Reusable card component for displaying books
 * 
 * Displays book cover, title, author, and format badges.
 * Works with both local library books (BookMetadata) and catalog books (CatalogBook).
 */
const BookCard: React.FC<BookCardProps> = ({ 
  book, 
  onClick, 
  onContextMenu,
  className = ''
}) => {
  const handleClick = () => onClick(book);
  
  const handleContextMenu = (e: React.MouseEvent) => {
    if (onContextMenu) {
      e.preventDefault();
      onContextMenu(book, e);
    }
  };

  // Type guard to check if book is from catalog
  const isCatalogBook = (b: BookMetadata | CatalogBook): b is CatalogBook => {
    return 'downloadUrl' in b;
  };

  // Get cover image URL
  const getCoverImage = (): string | null => {
    if ('coverImage' in book && book.coverImage) {
      return book.coverImage as string;
    }
    if ('cover' in book && book.cover) {
      return book.cover as string;
    }
    return null;
  };

  const coverImage = getCoverImage();

  // Determine format badges to display
  const getFormatBadges = () => {
    // For catalog books with alternative formats
    if (isCatalogBook(book) && book.alternativeFormats && book.alternativeFormats.length > 0) {
      return book.alternativeFormats.map((fmt, idx) => ({
        key: `${book.title}-${fmt.format}-${idx}`,
        format: fmt.format,
        mediaType: fmt.mediaType,
      }));
    }
    
    // For books with a single format
    if (book.format) {
      return [{
        key: `${book.title}-${book.format}`,
        format: book.format,
        mediaType: null,
      }];
    }
    
    return [];
  };

  const formatBadges = getFormatBadges();

  // Get badge color based on format
  const getBadgeColor = (format: string) => {
    const upperFormat = format.toUpperCase();
    if (upperFormat === 'PDF') return 'bg-red-600';
    if (upperFormat === 'AUDIOBOOK') return 'bg-purple-600';
    return 'bg-sky-500';
  };

  return (
    <div 
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      className={`cursor-pointer group relative ${className}`}
    >
      {/* Book Cover */}
      <div className="aspect-[2/3] bg-slate-800 rounded-lg overflow-hidden shadow-lg transform group-hover:scale-105 transition-transform duration-300 book-cover-container">
        {coverImage ? (
          <img
            src={coverImage}
            alt={book.title}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              const img = e.currentTarget as HTMLImageElement;
              img.onerror = null as any;
              // Try proxied URL for catalog books
              if (isCatalogBook(book) && book.coverImage) {
                img.src = proxiedUrl(book.coverImage);
              }
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center p-4 text-center text-slate-400">
            <span className="font-semibold">{book.title}</span>
          </div>
        )}
      </div>

      {/* Book Info */}
      <div className="mt-2 space-y-1">
        <h3 className="text-sm font-semibold text-white truncate group-hover:text-sky-400">
          {book.title}
        </h3>
        <p className="text-xs text-slate-400 truncate">
          {book.author}
        </p>
        
        {/* Format Badges */}
        {formatBadges.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {formatBadges.map((badge) => (
              <span
                key={badge.key}
                className={`inline-block text-white text-[10px] font-bold px-2 py-0.5 rounded ${getBadgeColor(badge.format)}`}
                title={badge.mediaType ? `Format: ${badge.format}, MediaType: ${badge.mediaType}` : `Format: ${badge.format}`}
              >
                {badge.format}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BookCard;
