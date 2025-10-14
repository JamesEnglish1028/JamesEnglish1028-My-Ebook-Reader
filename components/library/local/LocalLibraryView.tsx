import React, { useCallback, useEffect, useState } from 'react';
import { bookRepository } from '../../../domain/book';
import { useSortedBooks, useLocalStorage } from '../../../hooks';
import { logger } from '../../../services/logger';
import type { BookMetadata, CoverAnimationData } from '../../../types';
import { BookGrid, EmptyState } from '../shared';
import { SortControls, ImportButton } from '../local';
import DeleteConfirmationModal from '../../DeleteConfirmationModal';
import Spinner from '../../Spinner';
import { TrashIcon } from '../../icons';

interface LocalLibraryViewProps {
  /** Callback to open a book for reading */
  onOpenBook: (id: number, animationData: CoverAnimationData, format?: string) => void;
  /** Callback to show book detail view */
  onShowBookDetail: (book: BookMetadata, source: 'library' | 'catalog') => void;
  /** Callback when file is selected for import */
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  /** Import status */
  importStatus: { isLoading: boolean; message: string; error: string | null };
}

/**
 * LocalLibraryView - Container for local book library
 * 
 * Manages fetching, sorting, and displaying books from the local library.
 * Handles delete operations and book clicks.
 */
const LocalLibraryView: React.FC<LocalLibraryViewProps> = ({
  onOpenBook,
  onShowBookDetail,
  onFileChange,
  importStatus,
}) => {
  const [books, setBooks] = useState<BookMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [bookToDelete, setBookToDelete] = useState<BookMetadata | null>(null);
  const [sortOrder, setSortOrder] = useLocalStorage<string>('ebook-sort-order', 'added-desc');
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);

  // Fetch books on mount
  const fetchBooks = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await bookRepository.findAllMetadata();
      
      if (result.success) {
        setBooks(result.data);
      } else {
        logger.error('Failed to fetch books from repository:', (result as { success: false; error: string }).error);
        setBooks([]);
      }
    } catch (error) {
      logger.error('Failed to fetch books:', error);
      setBooks([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  // Sort books using custom hook
  const sortedBooks = useSortedBooks(books, sortOrder as any);

  // Handle book click - open for reading
  const handleLocalBookClick = async (book: BookMetadata) => {
    if (!book.id) return;

    const coverElement = document.querySelector(`[data-book-id="${book.id}"]`) as HTMLElement;
    const animationData: CoverAnimationData = coverElement
      ? {
          rect: coverElement.getBoundingClientRect(),
          coverImage: book.coverImage || null,
        }
      : { rect: new DOMRect(), coverImage: null };

    onOpenBook(book.id, animationData, book.format);
  };

  // Handle context menu - show delete option
  const handleBookContextMenu = (book: BookMetadata, e: React.MouseEvent) => {
    e.preventDefault();
    setBookToDelete(book);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = useCallback(async () => {
    if (!bookToDelete?.id) return;

    try {
      const result = await bookRepository.delete(bookToDelete.id);
      
      if (result.success) {
        // Refresh the book list after successful deletion
        await fetchBooks();
        setBookToDelete(null);
      } else {
        logger.error('Failed to delete book:', (result as { success: false; error: string }).error);
      }
    } catch (error) {
      logger.error('Failed to delete book:', error);
    }
  }, [bookToDelete, fetchBooks]);

  // Handle sort change
  const handleSortChange = (newSortOrder: string) => {
    setSortOrder(newSortOrder);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center mt-20">
        <Spinner />
      </div>
    );
  }

  return (
    <>
      {books.length > 0 ? (
        <BookGrid
          books={sortedBooks}
          onBookClick={handleLocalBookClick}
          onBookContextMenu={handleBookContextMenu}
        />
      ) : (
        <EmptyState variant="library" />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={!!bookToDelete}
        onClose={() => setBookToDelete(null)}
        onConfirm={handleDeleteConfirm}
        bookTitle={bookToDelete?.title || ''}
      />
    </>
  );
};

// Export additional components needed by parent
export { SortControls, ImportButton };
export default LocalLibraryView;
