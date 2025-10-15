import React, { useCallback, useState } from 'react';
import { useBooks, useDeleteBook, useSortedBooks, useLocalStorage } from '../../../hooks';
import type { BookMetadata, CoverAnimationData } from '../../../types';
import { BookGrid, EmptyState } from '../shared';
import { Loading, Error as ErrorDisplay } from '../../shared';
import { SortControls, ImportButton } from '../local';
import DeleteConfirmationModal from '../../DeleteConfirmationModal';

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
  const [bookToDelete, setBookToDelete] = useState<BookMetadata | null>(null);
  const [sortOrder, setSortOrder] = useLocalStorage<string>('ebook-sort-order', 'added-desc');
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);

  // Fetch books using React Query
  const { data: books = [], isLoading, error, refetch } = useBooks();
  
  // Delete book mutation
  const { mutate: deleteBook, isPending: isDeleting } = useDeleteBook();

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
  const handleDeleteConfirm = useCallback(() => {
    if (!bookToDelete?.id) return;

    deleteBook(bookToDelete.id, {
      onSuccess: () => {
        setBookToDelete(null);
      },
    });
  }, [bookToDelete, deleteBook]);

  // Handle sort change
  const handleSortChange = (newSortOrder: string) => {
    setSortOrder(newSortOrder);
  };

  // Show loading state
  if (isLoading) {
    return <Loading variant="skeleton" message="Loading library..." />;
  }

  // Show error state
  if (error) {
    return (
      <ErrorDisplay
        variant="page"
        title="Failed to Load Library"
        message={error instanceof Error ? error.message : 'Could not load books from the library.'}
        onRetry={() => refetch()}
      />
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
