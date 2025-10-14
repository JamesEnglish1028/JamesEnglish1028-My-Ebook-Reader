import React from 'react';
import type { BookMetadata, CatalogBook } from '../../../types';
import BookCard from '../shared/BookCard';
import Spinner from '../../Spinner';

interface BookGridProps {
  /** Books to display */
  books: BookMetadata[] | CatalogBook[];
  /** Whether books are loading */
  isLoading?: boolean;
  /** Callback when book is clicked */
  onBookClick: (book: BookMetadata | CatalogBook) => void;
  /** Callback for context menu (right-click) - optional */
  onBookContextMenu?: (book: BookMetadata | CatalogBook, e: React.MouseEvent) => void;
  /** Additional container class names */
  className?: string;
}

/**
 * BookGrid - Responsive grid layout for displaying books
 * 
 * Displays books in a responsive grid with loading state.
 * Uses BookCard component for individual book display.
 */
const BookGrid: React.FC<BookGridProps> = ({
  books,
  isLoading = false,
  onBookClick,
  onBookContextMenu,
  className = '',
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center mt-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div
      className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 ${className}`}
    >
      {books.map((book, index) => {
        // Generate a unique key based on book type
        const key = 'id' in book && book.id
          ? `book-${book.id}`
          : `catalog-${('downloadUrl' in book ? book.downloadUrl : book.title)}-${index}`;

        return (
          <BookCard
            key={key}
            book={book}
            onClick={onBookClick}
            onContextMenu={onBookContextMenu}
          />
        );
      })}
    </div>
  );
};

export default BookGrid;
