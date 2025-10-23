  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    (e.target as HTMLImageElement).src = '/default-cover.png';
  };
// Main BookDetailView component
import React, { useRef } from 'react';

import type { BookMetadata, Bookmark, Citation, CatalogBook, BookRecord, ImportStatus } from '../types';

export interface BookDetailViewProps {
  book: BookMetadata;
  source: string | null;
  catalogName?: string;
  onBack: () => void;
  onReadBook: (book: BookMetadata) => void;
  onImportFromCatalog?: (book: CatalogBook, catalogName?: string) => Promise<{ success: boolean; bookRecord?: BookRecord; existingBook?: BookRecord }>;
  importStatus?: ImportStatus | null;
  setImportStatus?: (status: ImportStatus | null) => void;
  userCitationFormat: 'apa' | 'mla';
}

import { LeftArrowIcon } from './icons';

// Utility: format date for display
const formatDate = (dateString: string | number): string => {
  const date = new Date(typeof dateString === 'number' ? dateString : dateString);
  if (isNaN(date.getTime())) return String(dateString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
};

// BookAnnotationsAside component
const BookAnnotationsAside: React.FC<{
  libraryBook: BookMetadata;
  bookmarks: Bookmark[];
  citations: Citation[];
  userCitationFormat: 'apa' | 'mla' | 'chicago';
}> = ({ libraryBook, bookmarks = [], citations = [], userCitationFormat }) => {
  function downloadTextFile(filename: string, content: string) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  }
  return (
    <section className="mt-8 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-200 mb-2">Bookmarks</h3>
        {bookmarks.length > 0 ? (
          <ul className="space-y-2">
            {bookmarks.map((bm, idx) => (
              <li key={bm.id || idx} className="bg-slate-800 rounded p-3 text-slate-300">
                <div className="font-semibold">{bm.label || `Bookmark ${idx + 1}`}</div>
                {bm.description && <div className="text-slate-400 text-sm mt-1">{bm.description}</div>}
                {bm.chapter && <div className="text-xs text-slate-500 mt-1">Chapter: {bm.chapter}</div>}
                <div className="text-xs text-slate-500">Created: {formatDate(bm.createdAt)}</div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-slate-500 text-sm">No bookmarks yet.</div>
        )}
      </div>
      <div>
        <h3 className="text-lg font-semibold text-slate-200 mb-2 flex items-center justify-between">
          Citations
          <button
            className="ml-2 px-3 py-1 rounded bg-sky-700 text-white text-xs font-bold hover:bg-sky-600"
            onClick={() => {
              const ris = citations.map(c => `${c.note || ''} [${c.chapter || ''}${c.pageNumber ? ', p.' + c.pageNumber : ''}]`).join('\n');
              downloadTextFile(`${libraryBook.title || 'citations'}.ris`, ris);
            }}
          >
            Export to RIS
          </button>
        </h3>
        {citations.length > 0 ? (
          <ul className="space-y-2">
            {citations.map((ct, idx) => {
              // Use the citation's formatType (citationFormat) as set by the user in Reader Views
              const citationFormat = ct.citationFormat || userCitationFormat || 'apa';
              const formatted = citationService.formatCitation(libraryBook, ct, citationFormat);
              return (
                <li key={ct.id || idx} className="bg-slate-800 rounded p-3 text-slate-300">
                  <div className="font-semibold mb-1">{formatted.text}</div>
                  {ct.note && <div className="text-slate-400 text-sm mt-1">{ct.note}</div>}
                  {ct.chapter && <div className="text-xs text-slate-500 mt-1">Chapter: {ct.chapter}</div>}
                  {ct.pageNumber && <div className="text-xs text-slate-500 mt-1">Page: {ct.pageNumber}</div>}
                  <div className="text-xs text-slate-500">Created: {formatDate(ct.createdAt)}</div>
                  <span className="inline-block mt-2 px-2 py-0.5 rounded text-xs font-bold bg-sky-900 text-sky-300">{formatted.format.toUpperCase()}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="text-slate-500 text-sm">No citations yet.</div>
        )}
      </div>
    </section>
  );
};

interface AnimationData {
  rect: { x: number; y: number; width: number; height: number; top: number; right: number; bottom: number; left: number };
  coverImage?: string;
}
import { bookmarkService } from '../domain/reader';
import { citationService } from '../domain/reader/citation-service';

export interface BookDetailViewProps {
  book: BookMetadata;
  source: string | null;
  catalogName?: string;
  onBack: () => void;
  onReadBook: (book: BookMetadata) => void;
  onImportFromCatalog?: (book: CatalogBook, catalogName?: string) => Promise<{ success: boolean; bookRecord?: BookRecord; existingBook?: BookRecord }>;
  importStatus?: ImportStatus | null;
  setImportStatus?: (status: ImportStatus | null) => void;
  userCitationFormat: 'apa' | 'mla' | 'chicago';
}

const BookDetailView: React.FC<BookDetailViewProps> = ({ book, onBack, source, catalogName, userCitationFormat, onReadBook, onImportFromCatalog, importStatus, setImportStatus }) => {
  const [localBookmarks, setLocalBookmarks] = React.useState<Bookmark[]>([]);
  const [localCitations, setLocalCitations] = React.useState<Citation[]>([]);

  React.useEffect(() => {
    if (book.id) {
      const result = bookmarkService.findByBookId(book.id);
      if (result.success) setLocalBookmarks(result.data);
    }
  }, [book.id]);

  React.useEffect(() => {
    if (book.id) {
      const result = citationService.findByBookId(book.id);
      if (result.success) setLocalCitations(result.data);
    }
  }, [book.id]);
  const coverRef = useRef<HTMLImageElement>(null);
  const handleReadClick = () => {
    if (onReadBook && book.id && coverRef.current) {
      const rect = coverRef.current.getBoundingClientRect();
      const animationData = {
        rect: {
          x: rect.x, y: rect.y,
          width: rect.width, height: rect.height,
          top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left,
        },
        coverImage: book.coverImage,
      };
      onReadBook(book.id, animationData, book.format || 'EPUB');
    }
  };
  // Import button state and modal
  const [showImportSuccess, setShowImportSuccess] = React.useState(false);
  const [isImporting, setIsImporting] = React.useState(false);

  const handleImportClick = async () => {
    if (isImporting) return;
    setIsImporting(true);
    if (onImportFromCatalog) {
      await onImportFromCatalog(book);
      setShowImportSuccess(true);
    }
    setIsImporting(false);
  };

  return (
    <div className="flex flex-col md:flex-row gap-8 items-start px-4 md:px-12 md:pr-16">
      {/* Left column: cover, buttons, bookmarks, citations */}
      <div className="md:w-1/3 flex-shrink-0">
        <BookDetailHeader onBack={onBack} source={source} />
        <div className="mb-10" />
        <div className="mb-6 flex flex-col items-center">
          {book.coverImage ? (
            <img
              ref={coverRef}
              src={book.coverImage}
              alt={book.title}
              className="w-full max-w-xs h-auto object-cover rounded-lg shadow-2xl aspect-[2/3] mb-4"
              onError={handleImgError}
            />
          ) : (
            <div className="w-full max-w-xs flex items-center justify-center p-4 text-center text-slate-400 bg-slate-800 rounded-lg aspect-[2/3] shadow-2xl">
              <span className="font-semibold">{book.title}</span>
            </div>
          )}
          {source === 'library' ? (
            <button className="mt-2 px-4 py-2 rounded bg-sky-700 text-white font-bold hover:bg-sky-600" onClick={handleReadClick}>
              Read Book
            </button>
          ) : (
            <button
              className="mt-2 px-4 py-2 rounded bg-sky-700 text-white font-bold hover:bg-sky-600 disabled:opacity-60 disabled:cursor-not-allowed"
              onClick={handleImportClick}
              disabled={isImporting}
            >
              {isImporting ? 'Importing...' : 'Import to My Library'}
            </button>
          )}
          {showImportSuccess && (
            <div className="fixed inset-0 flex items-center justify-center z-50">
              <div className="bg-slate-900 bg-opacity-90 p-8 rounded-lg shadow-2xl flex flex-col items-center">
                <h2 className="text-2xl font-bold text-sky-400 mb-4">Import Successful!</h2>
                <p className="text-slate-200 mb-6">The book has been imported to your library.</p>
                <button className="px-4 py-2 rounded bg-sky-700 text-white font-bold hover:bg-sky-600" onClick={() => setShowImportSuccess(false)}>
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="w-full max-w-xs mx-auto">
          <BookAnnotationsAside libraryBook={book} bookmarks={localBookmarks} citations={localCitations} userCitationFormat={userCitationFormat} />
        </div>
      </div>
      {/* Right column: Book Details */}
      <div className="md:w-2/3 mt-8 md:mt-0">
        {/* Book Title, Author, Publisher, etc. Section OUTSIDE container */}
        <div className="mb-6 mt-10 flex flex-col justify-start">
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-100 mb-6 leading-tight mt-0">{book.title}</h2>
          {book.author && <div className="mb-2 text-lg text-slate-400">By {book.author}</div>}
          {book.publisher && <div className="mb-2 text-slate-400">Publisher: {book.publisher}</div>}
          {book.publicationDate && <div className="mb-2 text-slate-400">Published: {book.publicationDate}</div>}
          {book.isbn && (
            <div className="mb-2 text-slate-400">Publisher ID: {book.isbn}</div>
          )}
          {book.language && <div className="mb-2 text-slate-400">Language: {book.language}</div>}
          {book.format && (
            <div className="mb-2">
              <span
                className={`inline-block text-white text-[10px] font-bold px-2 py-0.5 rounded mr-2 ${
                  book.format.toUpperCase() === 'PDF'
                    ? 'bg-red-600'
                    : book.format.toUpperCase() === 'AUDIOBOOK'
                    ? 'bg-purple-600'
                    : 'bg-sky-500'
                }`}
                title={`Format: ${book.format}`}
              >
                {book.format}
              </span>
            </div>
          )}
          {book.subjects && book.subjects.length > 0 && (
            <div className="mb-2 text-slate-400">Subjects: {book.subjects.join(', ')}</div>
          )}
          {book.description && <div className="mt-4 text-slate-300 text-base">{book.description}</div>}
        </div>
        {/* Book Details Section (accessibility, provider) INSIDE container */}
        <div className="space-y-6 p-6 bg-slate-800 rounded-lg border border-slate-700 md:mt-4 md:mr-6 md:mb-4 md:p-8">
          <h3 className="text-xl font-bold text-sky-300 mb-4">Book Details</h3>
          <ul className="space-y-2 text-base">
            <li>
              <span className="font-semibold text-slate-200">Provider:</span> <span className="text-slate-400">{book.providerName || (source === 'catalog' ? catalogName : 'Imported locally')}</span>
              {book.providerId ? (
                <div className="text-xs text-slate-500 mt-1">
                  Provider ID: {
                    /^https?:\/\//.test(book.providerId)
                      ? <a href={book.providerId} target="_blank" rel="noopener noreferrer" className="text-sky-400 underline hover:text-sky-600">{book.providerId}</a>
                      : book.providerId
                  }
                </div>
              ) : (
                <div className="text-xs text-slate-500 mt-1">Imported locally</div>
              )}
            </li>
            {book.accessibilitySummary && <li><span className="font-semibold text-slate-200">Accessibility:</span> <span className="text-slate-400">{book.accessibilitySummary}</span></li>}
            {book.accessibilityFeatures && book.accessibilityFeatures.length > 0 && (
              <li><span className="font-semibold text-slate-200">Features:</span> <span className="text-slate-400">{book.accessibilityFeatures.join(', ')}</span></li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default BookDetailView;
// BookDetailHeader: handles the header/back button section
const BookDetailHeader: React.FC<{ onBack: () => void, source: 'library' | 'catalog' }> = ({ onBack, source }) => (
  <header className="mb-8">
    <button onClick={onBack} className="inline-flex items-center gap-2 text-slate-300 hover:text-sky-400 transition-colors">
      <LeftArrowIcon className="w-5 h-5" />
      <span>Return to {source === 'library' ? 'My Library' : 'Catalog'}</span>
    </button>
  </header>
);
// ...existing code for BookDetailHeader, BookAnnotationsAside, type guards, and utility functions...
