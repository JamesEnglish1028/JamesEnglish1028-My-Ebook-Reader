

import React, { useState, useCallback } from 'react';
import { BookMetadata, CatalogBook, CoverAnimationData, BookRecord } from '../types';
import { BookIcon, DownloadIcon, LeftArrowIcon } from './icons';
import Spinner from './Spinner';
import DuplicateBookModal from './DuplicateBookModal';
import { db } from '../services/db';

interface BookDetailViewProps {
  book: BookMetadata | CatalogBook;
  source: 'library' | 'catalog';
  catalogName?: string;
  onBack: () => void;
  onReadBook: (id: number, animationData: CoverAnimationData) => void;
  onImportFromCatalog: (book: CatalogBook, catalogName?: string) => Promise<{ success: boolean; bookRecord?: BookRecord, existingBook?: BookRecord }>;
  importStatus: { isLoading: boolean; message: string; error: string | null; };
  setImportStatus: React.Dispatch<React.SetStateAction<{ isLoading: boolean; message: string; error: string | null; }>>;
}

const isLibraryBook = (b: BookMetadata | CatalogBook): b is BookMetadata => {
    return 'id' in b && typeof b.id === 'number';
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  
  // Check if the created date is invalid
  if (isNaN(date.getTime())) {
    // If parsing fails, it might be a simple year or year-month string
    // that the constructor couldn't handle perfectly. Return as-is.
    return dateString;
  }

  const trimmedDateString = dateString.trim();

  // Handles "YYYY"
  if (/^\d{4}$/.test(trimmedDateString)) {
    return date.getUTCFullYear().toString();
  }

  // Handles "YYYY-MM"
  if (/^\d{4}-\d{2}$/.test(trimmedDateString)) {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      timeZone: 'UTC', // Use UTC to avoid timezone shifting the month
    });
  }
  
  // Handles full dates like "YYYY-MM-DD" or ISO strings
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC', // Use UTC to avoid timezone shifting the day
  });
};


const BookDetailView: React.FC<BookDetailViewProps> = ({ book, source, catalogName, onBack, onReadBook, onImportFromCatalog, importStatus, setImportStatus }) => {
  const coverRef = React.useRef<HTMLImageElement>(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [duplicateBook, setDuplicateBook] = useState<BookRecord | null>(null);
  const [existingBook, setExistingBook] = useState<BookRecord | null>(null);

  const libraryBook = isLibraryBook(book) ? book : null;
  const catalogBook = !isLibraryBook(book) ? book : null;

  const description = 'description' in book ? book.description : catalogBook?.summary;
  const isLongDescription = description && description.length > 400;
  const coverImage = book.coverImage ? ('id' in book ? book.coverImage : `https://corsproxy.io/?${encodeURIComponent(book.coverImage)}`) : null;
  const providerId = (book as any).providerId || (book as any).isbn;
  const providerName = (book as BookMetadata).providerName;
  const format = ('format' in book && book.format) || (isLibraryBook(book) ? 'EPUB' : undefined);


  const handleReadClick = () => {
    if (libraryBook?.id && coverRef.current) {
        const rect = coverRef.current.getBoundingClientRect();
         const animationData = {
            rect: {
                x: rect.x, y: rect.y,
                width: rect.width, height: rect.height,
                top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left,
            } as DOMRect,
            coverImage: libraryBook.coverImage
        };
      onReadBook(libraryBook.id, animationData);
    }
  };

  const handleAddToBookshelf = async () => {
    if (catalogBook) {
        const result = await onImportFromCatalog(catalogBook, catalogName);
        if (!result.success && result.bookRecord && result.existingBook) {
            setDuplicateBook(result.bookRecord);
            setExistingBook(result.existingBook);
        }
    }
  };

  const handleReplaceBook = useCallback(async () => {
    if (!duplicateBook || !existingBook) return;

    setImportStatus({ isLoading: true, message: 'Replacing book...', error: null });
    const bookToSave = { ...duplicateBook, id: existingBook.id };

    setDuplicateBook(null);
    setExistingBook(null);

    try {
      await db.saveBook(bookToSave);
      setImportStatus({ isLoading: false, message: 'Import successful!', error: null });
      setTimeout(() => {
        setImportStatus({ isLoading: false, message: '', error: null });
        onBack();
      }, 2000);
    } catch (error) {
      console.error("Error replacing book:", error);
      setImportStatus({ isLoading: false, message: '', error: 'Failed to replace the book in the library.' });
    }
  }, [duplicateBook, existingBook, onBack, setImportStatus]);

  const handleAddAnyway = useCallback(async () => {
    if (!duplicateBook) return;

    setImportStatus({ isLoading: true, message: 'Saving new copy...', error: null });
    const bookToSave = { ...duplicateBook };
    
    setDuplicateBook(null);
    setExistingBook(null);

    try {
      await db.saveBook(bookToSave);
      setImportStatus({ isLoading: false, message: 'Import successful!', error: null });
       setTimeout(() => {
        setImportStatus({ isLoading: false, message: '', error: null });
        onBack();
      }, 2000);
    } catch (error) {
      console.error("Error adding duplicate book:", error);
      setImportStatus({ isLoading: false, message: '', error: 'Failed to add the new copy to the library.' });
    }
  }, [duplicateBook, onBack, setImportStatus]);

  const handleCancelDuplicate = () => {
    setDuplicateBook(null);
    setExistingBook(null);
    setImportStatus({ isLoading: false, message: '', error: null });
  };


  return (
    <div className="container mx-auto p-4 md:p-8 text-white min-h-screen">
      <header className="mb-8">
        <button onClick={onBack} className="inline-flex items-center gap-2 text-slate-300 hover:text-sky-400 transition-colors">
          <LeftArrowIcon className="w-5 h-5" />
          <span>Return to {source === 'library' ? 'My Library' : 'Catalog'}</span>
        </button>
      </header>

      <main className="grid md:grid-cols-12 gap-8 md:gap-12">
        {/* Left Column: Cover & Actions */}
        <aside className="md:col-span-4 lg:col-span-3">
            {coverImage ? (
                <img ref={coverRef} src={coverImage} alt={book.title} className="w-full h-auto object-cover rounded-lg shadow-2xl aspect-[2/3]" />
            ) : (
                <div className="w-full flex items-center justify-center p-4 text-center text-slate-400 bg-slate-800 rounded-lg aspect-[2/3] shadow-2xl">
                    <span className="font-semibold">{book.title}</span>
                </div>
            )}
             <div className="mt-6">
                {source === 'library' ? (
                    <button onClick={handleReadClick} className="w-full py-3 px-6 rounded-lg bg-sky-500 hover:bg-sky-600 transition-colors font-bold inline-flex items-center justify-center text-lg">
                        <BookIcon className="w-6 h-6 mr-2" />
                        Read Book
                    </button>
                ) : (
                    <button onClick={handleAddToBookshelf} disabled={importStatus.isLoading || (!!format && format !== 'EPUB')} className="w-full py-3 px-6 rounded-lg bg-sky-500 hover:bg-sky-600 transition-colors font-bold inline-flex items-center justify-center text-lg disabled:opacity-50 disabled:cursor-not-allowed">
                        <DownloadIcon className="w-6 h-6 mr-2" />
                        {!!format && format !== 'EPUB' ? `Cannot Import ${format}` : 'Add to Bookshelf'}
                    </button>
                )}
            </div>
        </aside>

        {/* Right Column: Details */}
        <article className="md:col-span-8 lg:col-span-9">
            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-white">{book.title}</h1>
            <h2 className="text-xl lg:text-2xl text-slate-300 mt-2">{book.author}</h2>
            
            <div className="mt-8 border-t border-slate-700 pt-8 space-y-8">
                {description && (
                    <section>
                        <h3 className="text-lg font-semibold text-slate-200 mb-3">Description</h3>
                        <div className="relative">
                            <div 
                                className={`prose prose-invert max-w-none text-slate-300 prose-p:mb-4 overflow-hidden transition-all duration-500 ease-in-out ${isLongDescription && !isDescriptionExpanded ? 'max-h-40' : 'max-h-[1000px]'}`}
                            >
                                <div dangerouslySetInnerHTML={{ __html: description }} />
                            </div>
                            {isLongDescription && !isDescriptionExpanded && (
                                <div className="absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-slate-900 to-transparent pointer-events-none"></div>
                            )}
                        </div>
                        {isLongDescription && (
                            <button
                                onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                                className="text-sky-400 hover:text-sky-300 font-semibold text-sm mt-2"
                            >
                                {isDescriptionExpanded ? 'Show Less' : 'Read More'}
                            </button>
                        )}
                    </section>
                )}

                {(book.publisher || book.publicationDate || providerId || format) && (
                    <section>
                        <h3 className="text-lg font-semibold text-slate-200 mb-3">Publication Details</h3>
                        <div className="bg-slate-800/50 rounded-lg border border-slate-700">
                            <dl className="divide-y divide-slate-700">
                                {book.publisher && (
                                    <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                        <dt className="text-sm font-medium text-slate-400">Publisher</dt>
                                        <dd className="mt-1 text-sm text-slate-200 sm:mt-0 sm:col-span-2">{book.publisher}</dd>
                                    </div>
                                )}
                                {book.publicationDate && (
                                     <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                        <dt className="text-sm font-medium text-slate-400">Published</dt>
                                        <dd className="mt-1 text-sm text-slate-200 sm:mt-0 sm:col-span-2">{formatDate(book.publicationDate)}</dd>
                                    </div>
                                )}
                                {providerId && (
                                     <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                        <dt className="text-sm font-medium text-slate-400">Provider ID</dt>
                                        <dd className="mt-1 text-sm text-slate-200 sm:mt-0 sm:col-span-2">
                                            {providerId}
                                            {providerName && (
                                                <span className="block text-xs text-slate-400">from {providerName}</span>
                                            )}
                                        </dd>
                                    </div>
                                )}
                                {format && (
                                    <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                        <dt className="text-sm font-medium text-slate-400">Format</dt>
                                        <dd className="mt-1 text-sm text-slate-200 sm:mt-0 sm:col-span-2">
                                           <span className="bg-slate-700 text-slate-300 text-xs font-medium px-2 py-1 rounded-md">
                                                {format}
                                            </span>
                                        </dd>
                                    </div>
                                )}
                            </dl>
                        </div>
                    </section>
                )}
                
                {book.subjects && book.subjects.length > 0 && (
                    <section>
                        <h3 className="text-lg font-semibold text-slate-200 mb-3">Subjects</h3>
                        <div className="flex flex-wrap gap-2">
                            {book.subjects.map((subject, index) => (
                                <span key={index} className="bg-slate-700 text-slate-300 text-sm font-medium px-3 py-1.5 rounded-full">
                                    {subject}
                                </span>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </article>
      </main>
      
      {(importStatus.isLoading || importStatus.error || importStatus.message === 'Import successful!') && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 p-8 rounded-lg shadow-xl text-center max-w-sm w-full">
                {importStatus.isLoading && !importStatus.error && <Spinner text={importStatus.message} />}
                {importStatus.message === 'Import successful!' && !importStatus.isLoading && (
                    <div className="flex flex-col items-center">
                        <h3 className="text-xl font-bold text-green-400 mb-4">Success</h3>
                        <p className="text-slate-300 mb-6">Book added to your library!</p>
                    </div>
                )}
                {importStatus.error && (
                    <div className="flex flex-col items-center">
                        <h3 className="text-xl font-bold text-red-400 mb-4">Import Failed</h3>
                        <p className="text-slate-300 mb-6">{importStatus.error}</p>
                        <button
                            onClick={() => setImportStatus({ isLoading: false, message: '', error: null })}
                            className="bg-sky-500 hover:bg-sky-600 text-white font-bold py-2 px-6 rounded-lg transition-colors"
                        >
                            Close
                        </button>
                    </div>
                )}
            </div>
        </div>
      )}

      <DuplicateBookModal
        isOpen={!!duplicateBook}
        onClose={handleCancelDuplicate}
        onReplace={handleReplaceBook}
        onAddAnyway={handleAddAnyway}
        bookTitle={duplicateBook?.title || ''}
      />
    </div>
  );
};

export default BookDetailView;