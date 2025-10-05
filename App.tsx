
import React, { useState, useCallback } from 'react';
import Library from './components/Library';
import ReaderView from './components/ReaderView';
import BookDetailView from './components/BookDetailView';
import { db } from './services/db';
import { BookRecord, CoverAnimationData, BookMetadata, CatalogBook } from './types';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'library' | 'reader' | 'bookDetail'>('library');
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
  const [coverAnimationData, setCoverAnimationData] = useState<CoverAnimationData | null>(null);

  const [detailViewData, setDetailViewData] = useState<{
    book: BookMetadata | CatalogBook;
    source: 'library' | 'catalog';
  } | null>(null);
  
  const [importStatus, setImportStatus] = useState<{
    isLoading: boolean;
    message: string;
    error: string | null;
  }>({
    isLoading: false,
    message: '',
    error: null,
  });

  // Initialize DB on app start
  React.useEffect(() => {
    db.init();
  }, []);

  const handleOpenBook = useCallback((id: number, animationData: CoverAnimationData) => {
    setSelectedBookId(id);
    setCoverAnimationData(animationData);
    setCurrentView('reader');
  }, []);

  const handleCloseReader = useCallback(() => {
    setSelectedBookId(null);
    setCurrentView('library');
    setCoverAnimationData(null);
  }, []);

  const handleShowBookDetail = useCallback((book: BookMetadata | CatalogBook, source: 'library' | 'catalog') => {
    setDetailViewData({ book, source });
    setCurrentView('bookDetail');
  }, []);
  
  const handleReturnToLibrary = useCallback(() => {
    setDetailViewData(null);
    setCurrentView('library');
  }, []);
  
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

  const processAndSaveBook = useCallback(async (
    epubData: ArrayBuffer, 
    fileName: string = 'Untitled Book',
    source: 'file' | 'catalog' = 'file'
  ): Promise<{ success: boolean; bookRecord?: BookRecord, existingBook?: BookRecord }> => {
    setImportStatus({ isLoading: true, message: 'Parsing EPUB...', error: null });
    try {
        const ePub = (window as any).ePub;
        const book = ePub(epubData);
        const metadata = await book.loaded.metadata;

        const identifier = metadata.identifier;
        
        setImportStatus(prev => ({ ...prev, message: 'Extracting cover...' }));
        let coverImage: string | null = null;
        const coverUrl = await book.coverUrl();
        if (coverUrl) {
            coverImage = await blobUrlToBase64(coverUrl);
        }

        const subjectsRaw = metadata.subject || metadata.subjects;
        const subjects = subjectsRaw ? (Array.isArray(subjectsRaw) ? subjectsRaw.map(s => typeof s === 'object' ? s.name : s) : [subjectsRaw]) : [];

        const newBook: BookRecord = {
          title: metadata.title || fileName,
          author: metadata.creator || 'Unknown Author',
          coverImage,
          epubData,
          publisher: metadata.publisher,
          publicationDate: metadata.pubdate,
          isbn: identifier,
          description: metadata.description,
          subjects: subjects,
        };

        if (identifier) {
            const existing = await db.findBookByIsbn(identifier);
            if (existing) {
                setImportStatus({ isLoading: false, message: '', error: null });
                return { success: false, bookRecord: newBook, existingBook: existing };
            }
        }
        
        setImportStatus(prev => ({ ...prev, message: 'Saving to library...' }));
        await db.saveBook(newBook);
        
        setImportStatus({ isLoading: false, message: 'Import successful!', error: null });
        setTimeout(() => setImportStatus({ isLoading: false, message: '', error: null }), 2000);
        
        if (source === 'catalog') {
            handleReturnToLibrary();
        }

        return { success: true };

    } catch (error) {
        console.error("Error processing EPUB:", error);
        let errorMessage = "Failed to import the EPUB file. It might be corrupted or in an unsupported format.";
        if (error instanceof Error && error.message.includes('File is not a zip')) {
          errorMessage = "The provided file is not a valid EPUB (it's not a zip archive). Please try a different file.";
        }
        setImportStatus({ isLoading: false, message: '', error: errorMessage });
        return { success: false };
    }
  }, [handleReturnToLibrary]);

  const handleImportFromCatalog = useCallback(async (book: CatalogBook) => {
    setImportStatus({ isLoading: true, message: `Downloading ${book.title}...`, error: null });
    try {
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(book.downloadUrl)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) {
        const statusInfo = `${response.status}${response.statusText ? ` ${response.statusText}` : ''}`;
        let errorMessage = `Download failed. The server responded with an error (${statusInfo}). The book might not be available at this address.`;
        if (response.status === 401 || response.status === 403) {
            errorMessage = `Download failed (${statusInfo}). This catalog or book requires authentication (a login or password), which is not supported by this application.`;
        }
        throw new Error(errorMessage);
      }
      const epubData = await response.arrayBuffer();
      // The processAndSaveBook function now returns info about duplicates
      return await processAndSaveBook(epubData, book.title, 'catalog');
    } catch (error) {
      console.error("Error importing from catalog:", error);
      let message = "Download failed. The file may no longer be available or there was a network issue.";
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
          message = "Download failed due to a network error. This could be due to your internet connection or the public CORS proxy being temporarily down.";
      } else if (error instanceof Error) {
          message = error.message;
      }
      setImportStatus({ isLoading: false, message: '', error: message });
      return { success: false };
    }
  }, [processAndSaveBook]);


  const renderView = () => {
    switch(currentView) {
      case 'reader':
        return selectedBookId !== null && (
          <ReaderView
            bookId={selectedBookId}
            onClose={handleCloseReader}
            animationData={coverAnimationData}
          />
        );
      case 'bookDetail':
        return detailViewData && (
          <BookDetailView
            book={detailViewData.book}
            source={detailViewData.source}
            onBack={handleReturnToLibrary}
            onReadBook={handleOpenBook}
            onImportFromCatalog={handleImportFromCatalog}
            importStatus={importStatus}
            setImportStatus={setImportStatus}
          />
        );
      case 'library':
      default:
        return (
          <Library
            onOpenBook={handleOpenBook}
            onShowBookDetail={handleShowBookDetail}
            processAndSaveBook={processAndSaveBook}
            importStatus={importStatus}
            setImportStatus={setImportStatus}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 font-sans">
      {renderView()}
    </div>
  );
};

export default App;
