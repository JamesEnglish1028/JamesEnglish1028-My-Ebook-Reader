import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../services/db';
import { BookMetadata, BookRecord, CoverAnimationData } from '../types';
import { UploadIcon } from './icons';
import Spinner from './Spinner';

interface LibraryProps {
  onOpenBook: (id: number, animationData: CoverAnimationData) => void;
}

const blobUrlToBase64 = async (blobUrl: string): Promise<string> => {
    const response = await fetch(blobUrl);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

const Library: React.FC<LibraryProps> = ({ onOpenBook }) => {
  const [books, setBooks] = useState<BookMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [importStatus, setImportStatus] = useState<{
    isLoading: boolean;
    message: string;
    error: string | null;
  }>({
    isLoading: false,
    message: '',
    error: null,
  });

  const fetchBooks = useCallback(async () => {
    setIsLoading(true);
    try {
      const booksData = await db.getBooksMetadata();
      setBooks(booksData.reverse());
    } catch (error) {
      console.error("Failed to fetch books:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportStatus({ isLoading: true, message: 'Reading file...', error: null });
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const epubData = e.target?.result as ArrayBuffer;
        if (!epubData) {
            throw new Error("Could not read file data.");
        }

        setImportStatus(prev => ({ ...prev, message: 'Parsing EPUB structure...' }));
        const ePub = (window as any).ePub;
        const book = ePub(epubData);
        const metadata = await book.loaded.metadata;
        
        setImportStatus(prev => ({ ...prev, message: 'Extracting cover & metadata...' }));
        let coverImage: string | null = null;
        const coverUrl = await book.coverUrl();
        if (coverUrl) {
            coverImage = await blobUrlToBase64(coverUrl);
        }

        const newBook: BookRecord = {
          title: metadata.title || 'Untitled Book',
          author: metadata.creator || 'Unknown Author',
          coverImage,
          epubData,
          publisher: metadata.publisher,
          publicationDate: metadata.pubdate,
          isbn: metadata.identifier,
        };

        setImportStatus(prev => ({ ...prev, message: 'Saving book to library...' }));
        await db.addBook(newBook);
        
        setImportStatus({ isLoading: false, message: '', error: null });
        fetchBooks(); // Refresh library
      } catch (error) {
        console.error("Error parsing EPUB file:", error);
        let errorMessage = "Failed to import the EPUB file. It might be corrupted or in an unsupported format.";
        if (error instanceof Error && error.message.includes('File is not a zip')) {
          errorMessage = "The provided file is not a valid EPUB (it's not a zip archive). Please try a different file.";
        }
        setImportStatus({ isLoading: false, message: '', error: errorMessage });
      } finally {
        event.target.value = ''; // Reset file input
      }
    };

    reader.onerror = () => {
        setImportStatus({ isLoading: false, message: '', error: 'An error occurred while trying to read the file.' });
    };

    reader.readAsArrayBuffer(file);
  };
  
  const handleBookClick = (event: React.MouseEvent<HTMLDivElement>, book: BookMetadata) => {
    const coverElement = event.currentTarget.querySelector('.book-cover-container');
    if (coverElement && book.id) {
        const rect = coverElement.getBoundingClientRect();
        // DOMRect is not a plain object, so we convert it to one for React state
        const plainRect = {
            x: rect.x, y: rect.y,
            width: rect.width, height: rect.height,
            top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left,
        };
        onOpenBook(book.id, { rect: plainRect as DOMRect, coverImage: book.coverImage });
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-white tracking-tight">My Library</h1>
        <label htmlFor="epub-upload" className={`cursor-pointer bg-sky-500 hover:bg-sky-600 text-white font-bold py-2 px-4 rounded-lg inline-flex items-center transition-colors duration-200 ${importStatus.isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>
          <UploadIcon className="w-5 h-5 mr-2" />
          <span>Import Book</span>
        </label>
        <input id="epub-upload" type="file" accept=".epub" className="hidden" onChange={handleFileChange} disabled={importStatus.isLoading} />
      </header>

      {(importStatus.isLoading || importStatus.error) && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 p-8 rounded-lg shadow-xl text-center max-w-sm w-full">
                {importStatus.isLoading && !importStatus.error && (
                    <Spinner text={importStatus.message} />
                )}
                {importStatus.error && (
                    <div className="flex flex-col items-center">
                        <h3 className="text-xl font-bold text-red-400 mb-4">Import Failed</h3>
                        <p className="text-slate-300 mb-6">{importStatus.error}</p>
                        <button
                            onClick={() => setImportStatus({ isLoading: false, message: '', error: null })}
                            className="bg-sky-500 hover:bg-sky-600 text-white font-bold py-2 px-6 rounded-lg transition-colors duration-200"
                        >
                            Close
                        </button>
                    </div>
                )}
            </div>
        </div>
      )}
      
      {isLoading ? (
        <div className="flex justify-center mt-20">
            <Spinner />
        </div>
      ) : books.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {books.map((book) => (
            <div key={book.id} onClick={(e) => book.id && handleBookClick(e, book)} className="cursor-pointer group">
              <div className="aspect-[2/3] bg-slate-800 rounded-lg overflow-hidden shadow-lg transform group-hover:scale-105 transition-transform duration-300 book-cover-container">
                {book.coverImage ? (
                  <img src={book.coverImage} alt={book.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-4 text-center text-slate-400">
                    <span className="font-semibold">{book.title}</span>
                  </div>
                )}
              </div>
              <div className="mt-2">
                <h3 className="text-sm font-semibold text-white truncate group-hover:text-sky-400">{book.title}</h3>
                <p className="text-xs text-slate-400 truncate">{book.author}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-slate-800 rounded-lg">
          <h2 className="text-2xl font-semibold text-white">Your library is empty.</h2>
          <p className="text-slate-400 mt-2">Import your first EPUB book to get started!</p>
        </div>
      )}
    </div>
  );
};

export default Library;