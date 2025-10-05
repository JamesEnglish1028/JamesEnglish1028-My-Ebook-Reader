import React, { useState, useCallback, useEffect } from 'react';
import Library from './components/Library';
import ReaderView from './components/ReaderView';
import BookDetailView from './components/BookDetailView';
import { db } from './services/db';
import { BookRecord, CoverAnimationData, BookMetadata, CatalogBook, Catalog, Bookmark, Citation, ReaderSettings, SyncPayload } from './types';
import SplashScreen from './components/SplashScreen';
import SettingsModal from './components/SettingsModal';
import { useAuth } from './contexts/AuthContext';
import { uploadLibraryToDrive, downloadLibraryFromDrive } from './services/google';
import LocalStorageModal from './components/LocalStorageModal';
import AboutPage from './components/AboutPage';
import ErrorBoundary from './components/ErrorBoundary';


const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'library' | 'reader' | 'bookDetail' | 'about'>('library');
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
  const [coverAnimationData, setCoverAnimationData] = useState<CoverAnimationData | null>(null);
  const [activeCatalog, setActiveCatalog] = useState<Catalog | null>(null);
  const [catalogNavPath, setCatalogNavPath] = useState<{ name: string, url: string }[]>([]);
  const [showSplash, setShowSplash] = useState(true);
  const [isCloudSyncModalOpen, setIsCloudSyncModalOpen] = useState(false);
  const [isLocalStorageModalOpen, setIsLocalStorageModalOpen] = useState(false);
  const { tokenClient } = useAuth();
  const [syncStatus, setSyncStatus] = useState<{
    state: 'idle' | 'syncing' | 'success' | 'error';
    message: string;
  }>({ state: 'idle', message: '' });

  const [detailViewData, setDetailViewData] = useState<{
    book: BookMetadata | CatalogBook;
    source: 'library' | 'catalog';
    catalogName?: string;
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

  // Initialize DB on app start & handle splash screen
  useEffect(() => {
    db.init();
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500); // Show splash for 2.5 seconds
    
    return () => clearTimeout(timer);
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

  const handleShowBookDetail = useCallback((book: BookMetadata | CatalogBook, source: 'library' | 'catalog', catalogName?: string) => {
    setDetailViewData({ book, source, catalogName });
    setCurrentView('bookDetail');
  }, []);
  
  const handleReturnToLibrary = useCallback(() => {
    setDetailViewData(null);
    setCurrentView('library');
  }, []);

  const handleShowAbout = useCallback(() => {
    setCurrentView('about');
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
    source: 'file' | 'catalog' = 'file',
    providerName?: string,
    providerId?: string,
    format?: string
  ): Promise<{ success: boolean; bookRecord?: BookRecord, existingBook?: BookRecord }> => {
    setImportStatus({ isLoading: true, message: 'Parsing EPUB...', error: null });
    try {
        const ePub = (window as any).ePub;
        const book = ePub(epubData);
        const metadata = await book.loaded.metadata;

        setImportStatus(prev => ({ ...prev, message: 'Extracting cover...' }));
        let coverImage: string | null = null;
        const coverUrl = await book.coverUrl();
        if (coverUrl) {
            coverImage = await blobUrlToBase64(coverUrl);
        }

        const subjectsRaw = metadata.subject || metadata.subjects;
        const subjects = subjectsRaw ? (Array.isArray(subjectsRaw) ? subjectsRaw.map(s => typeof s === 'object' ? s.name : s) : [subjectsRaw]) : [];
        
        // Prioritize the provider ID from the catalog feed, fall back to the one in the EPUB file.
        const finalProviderId = providerId || metadata.identifier;

        const newBook: BookRecord = {
          title: metadata.title || fileName,
          author: metadata.creator || 'Unknown Author',
          coverImage,
          epubData,
          publisher: metadata.publisher,
          publicationDate: metadata.pubdate,
          providerId: finalProviderId,
          providerName: providerName,
          description: metadata.description,
          subjects: subjects,
          format: format || 'EPUB', // Default to EPUB for file uploads
        };

        if (finalProviderId) {
            const existing = await db.findBookByIdentifier(finalProviderId);
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

  const handleImportFromCatalog = useCallback(async (book: CatalogBook, catalogName?: string) => {
    if (book.format && book.format.toUpperCase() !== 'EPUB') {
        const error = `Cannot import this book. The application currently only supports the EPUB format, but this book is a ${book.format}.`;
        setImportStatus({ isLoading: false, message: '', error });
        return { success: false };
    }
    
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
      // Pass the providerId and format from the catalog book object to ensure they're saved correctly.
      return await processAndSaveBook(epubData, book.title, 'catalog', catalogName, book.providerId, book.format);
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
  
  const gatherDataForUpload = async (): Promise<{ payload: SyncPayload; booksWithData: BookRecord[] }> => {
    const booksWithData = await db.getAllBooks();
    const library = booksWithData.map(({ epubData, ...meta }) => meta);

    const catalogs: Catalog[] = JSON.parse(localStorage.getItem('ebook-catalogs') || '[]');
    const settings: ReaderSettings = JSON.parse(localStorage.getItem('ebook-reader-settings-global') || '{}');

    const bookmarks: Record<number, Bookmark[]> = {};
    const citations: Record<number, Citation[]> = {};
    const positions: Record<number, string | null> = {};

    booksWithData.forEach(book => {
        if (book.id) {
            bookmarks[book.id] = JSON.parse(localStorage.getItem(`ebook-reader-bookmarks-${book.id}`) || '[]');
            citations[book.id] = JSON.parse(localStorage.getItem(`ebook-reader-citations-${book.id}`) || '[]');
            positions[book.id] = localStorage.getItem(`ebook-reader-pos-${book.id}`);
        }
    });

    return {
        payload: { library, catalogs, bookmarks, citations, positions, settings },
        booksWithData
    };
  };
  
  const handleUploadToDrive = async () => {
    if (!tokenClient) return;
    setSyncStatus({ state: 'syncing', message: 'Gathering local data...' });
    try {
        const { payload, booksWithData } = await gatherDataForUpload();
        setSyncStatus({ state: 'syncing', message: 'Uploading to Google Drive... This may take a while.' });
        await uploadLibraryToDrive(payload, booksWithData, (progressMsg) => {
            setSyncStatus({ state: 'syncing', message: progressMsg });
        });
        localStorage.setItem('ebook-reader-last-sync', new Date().toISOString());
        setSyncStatus({ state: 'success', message: 'Library successfully uploaded!' });
    } catch (error) {
        console.error('Upload failed:', error);
        setSyncStatus({ state: 'error', message: error instanceof Error ? error.message : 'An unknown error occurred.' });
    }
  };

  const handleDownloadFromDrive = async () => {
    if (!tokenClient) return;

    const confirmed = window.confirm(
      'DANGER: This will replace your entire local library with the version from Google Drive.\n\n' +
      'Any local books or changes not uploaded to Drive will be permanently lost.\n\n' +
      'Are you absolutely sure you want to continue?'
    );

    if (!confirmed) return;

    setSyncStatus({ state: 'syncing', message: 'Downloading from Google Drive...' });
    try {
        const downloadedData = await downloadLibraryFromDrive((progressMsg) => {
            setSyncStatus({ state: 'syncing', message: progressMsg });
        });

        if (!downloadedData) {
          throw new Error("No data found in Google Drive.");
        }

        setSyncStatus({ state: 'syncing', message: 'Clearing local library...' });
        await db.clearAllBooks();
        
        // Clear all localStorage data managed by the app
        Object.keys(localStorage)
          .filter(key => key.startsWith('ebook-reader-'))
          .forEach(key => localStorage.removeItem(key));
        
        setSyncStatus({ state: 'syncing', message: 'Importing downloaded library...' });
        
        // Restore metadata
        localStorage.setItem('ebook-catalogs', JSON.stringify(downloadedData.payload.catalogs || []));
        localStorage.setItem('ebook-reader-settings-global', JSON.stringify(downloadedData.payload.settings || {}));

        for (const book of downloadedData.booksWithData) {
            await db.saveBook(book);
            if (book.id) {
                const bookId = book.id;
                if (downloadedData.payload.bookmarks[bookId]) {
                    localStorage.setItem(`ebook-reader-bookmarks-${bookId}`, JSON.stringify(downloadedData.payload.bookmarks[bookId]));
                }
                if (downloadedData.payload.citations[bookId]) {
                    localStorage.setItem(`ebook-reader-citations-${bookId}`, JSON.stringify(downloadedData.payload.citations[bookId]));
                }
                if (downloadedData.payload.positions[bookId]) {
                    localStorage.setItem(`ebook-reader-pos-${bookId}`, downloadedData.payload.positions[bookId]!);
                }
            }
        }
        localStorage.setItem('ebook-reader-last-sync', new Date().toISOString());
        setSyncStatus({ state: 'success', message: 'Library successfully downloaded! Reloading app...' });

        // Reload to apply all changes cleanly
        setTimeout(() => window.location.reload(), 2000);

    } catch (error) {
        console.error('Download failed:', error);
        setSyncStatus({ state: 'error', message: error instanceof Error ? error.message : 'An unknown error occurred.' });
    }
  };


  const renderView = () => {
    switch(currentView) {
      case 'reader':
        return selectedBookId !== null && (
          <ErrorBoundary 
            onReset={handleCloseReader}
            fallbackMessage="There was an error while trying to display this book. Returning to the library."
          >
            <ReaderView
              bookId={selectedBookId}
              onClose={handleCloseReader}
              animationData={coverAnimationData}
            />
          </ErrorBoundary>
        );
      case 'bookDetail':
        return detailViewData && (
          <ErrorBoundary
            onReset={handleReturnToLibrary}
            fallbackMessage="There was an error showing the book details. Returning to the library."
          >
            <BookDetailView
              book={detailViewData.book}
              source={detailViewData.source}
              catalogName={detailViewData.catalogName}
              onBack={handleReturnToLibrary}
              onReadBook={handleOpenBook}
              onImportFromCatalog={handleImportFromCatalog}
              importStatus={importStatus}
              setImportStatus={setImportStatus}
            />
          </ErrorBoundary>
        );
      case 'about':
        return <AboutPage onBack={handleReturnToLibrary} />;
      case 'library':
      default:
        return (
          <ErrorBoundary
            onReset={() => window.location.reload()}
            fallbackMessage="There was a critical error in the library. Please try reloading the application."
          >
            <Library
              onOpenBook={handleOpenBook}
              onShowBookDetail={handleShowBookDetail}
              processAndSaveBook={processAndSaveBook}
              importStatus={importStatus}
              setImportStatus={setImportStatus}
              activeCatalog={activeCatalog}
              setActiveCatalog={setActiveCatalog}
              catalogNavPath={catalogNavPath}
              setCatalogNavPath={setCatalogNavPath}
              onOpenCloudSyncModal={() => setIsCloudSyncModalOpen(true)}
              onOpenLocalStorageModal={() => setIsLocalStorageModalOpen(true)}
              onShowAbout={handleShowAbout}
            />
          </ErrorBoundary>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 font-sans">
      <SplashScreen isVisible={showSplash} />
      {!showSplash && renderView()}
      <SettingsModal 
        isOpen={isCloudSyncModalOpen}
        onClose={() => setIsCloudSyncModalOpen(false)}
        onUploadToDrive={handleUploadToDrive}
        onDownloadFromDrive={handleDownloadFromDrive}
        syncStatus={syncStatus}
        setSyncStatus={setSyncStatus}
      />
      <LocalStorageModal
        isOpen={isLocalStorageModalOpen}
        onClose={() => setIsLocalStorageModalOpen(false)}
      />
    </div>
  );
};

export default App;