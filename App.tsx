import React, { lazy, Suspense, useCallback, useEffect, useState } from 'react';

// Styles required by react-pdf layers
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';

// Component imports - using barrel exports for cleaner code
import {
  AboutPage,
  BookDetailView,
  ErrorBoundary,
  Library,
  LocalStorageModal,
  NetworkDebugModal,
  OpdsCredentialsModal,
  ReaderView,
  SettingsModal,
  SplashScreen,
  useConfirm,
  useToast
} from './components';

// Service imports - using barrel exports
import { useAuth } from './contexts/AuthContext';
import {
  blobUrlToBase64,
  db,
  downloadLibraryFromDrive,
  findCredentialForUrl,
  generatePdfCover,
  imageUrlToBase64,
  logger,
  maybeProxyForCors,
  resolveAcquisitionChain,
  saveOpdsCredential,
  uploadLibraryToDrive
} from './services';

// Type imports - kept separate as they're from a single file
import type {
  Bookmark,
  BookMetadata,
  BookRecord,
  Catalog,
  CatalogBook,
  CatalogRegistry,
  Citation,
  CoverAnimationData,
  CredentialPrompt,
  ReaderSettings,
  SyncPayload,
} from './types';

// Context imports

// Lazy-load the PDF reader so its dependencies (react-pdf, pdfjs-dist) are code-split
const PdfReaderView = lazy(() => import('./components/PdfReaderView'));


const AppInner: React.FC = () => {
  const toast = useToast();
  const [currentView, setCurrentView] = useState<'library' | 'reader' | 'pdfReader' | 'bookDetail' | 'about'>('library');
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
  const [coverAnimationData, setCoverAnimationData] = useState<CoverAnimationData | null>(null);
  const [activeOpdsSource, setActiveOpdsSource] = useState<Catalog | CatalogRegistry | null>(null);
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

  const [credentialPrompt, setCredentialPrompt] = useState<CredentialPrompt>(
    { isOpen: false, host: null, pendingHref: null, pendingBook: null, pendingCatalogName: undefined, authDocument: null },
  );

  // Initialize DB on app start & handle splash screen
  useEffect(() => {
    db.init();
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500); // Show splash for 2.5 seconds

    return () => clearTimeout(timer);
  }, []);


  const navigate = useNavigate();

  // Optional: auto-open first book for quick QA when URL contains ?autoOpen=first
  const location = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const auto = params.get('autoOpen');
    if (auto === 'first') {
      (async () => {
        try {
          const all = await db.getAllBooks();
          if (!all || all.length === 0) return;
          const first = all[0];
          if (!first || !first.id) return;
          const format = first.format || 'EPUB';
          if (format === 'PDF') {
            navigate(`/pdf/${first.id}`);
          } else {
            setSelectedBookId(first.id as number);
            setCurrentView('reader');
          }
        } catch (e) {
          logger.warn('Auto-open failed', e);
        }
      })();
    }
    // only run on first mount or when search changes
  }, [location.search, navigate]);

  const handleOpenBook = useCallback((id: number, animationData: CoverAnimationData, format: string = 'EPUB') => {
    setSelectedBookId(id);
    if (format === 'PDF') {
      // Navigate to the dedicated PDF route; PdfReaderView will read the id from params
      setCoverAnimationData(null); // No animation for PDFs for now
      navigate(`/pdf/${id}`);
    } else {
      setCoverAnimationData(animationData);
      setCurrentView('reader');
    }
  }, [navigate]);

  const confirm = useConfirm();


  const handleCloseReader = useCallback(() => {
    setSelectedBookId(null);
    setCurrentView('library');
    setCoverAnimationData(null);
    // If the user was on a route, navigate back to root
    try { navigate('/'); } catch { }
  }, [navigate]);

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

  const processAndSaveBook = useCallback(async (
    bookData: ArrayBuffer,
    fileName: string = 'Untitled Book',
    authorName?: string,
    source: 'file' | 'catalog' = 'file',
    providerName?: string,
    providerId?: string,
    format?: string,
    coverImageUrl?: string | null,
  ): Promise<{ success: boolean; bookRecord?: BookRecord, existingBook?: BookRecord }> => {

    let finalCoverImage: string | null = null;
    if (coverImageUrl) {
      finalCoverImage = await imageUrlToBase64(coverImageUrl);
    }

    const effectiveFormat = format || (fileName.toLowerCase().endsWith('.pdf') ? 'PDF' : 'EPUB');

    if (effectiveFormat === 'PDF') {
      setImportStatus({ isLoading: true, message: 'Saving PDF to library...', error: null });
      try {
        const title = fileName.replace(/\.(pdf)$/i, '');
        const author = authorName || 'Unknown Author';

        if (!finalCoverImage && source === 'file') {
          finalCoverImage = await generatePdfCover(title, author);
        }

        const newBook: BookRecord = {
          title: title,
          author: author,
          coverImage: finalCoverImage,
          epubData: bookData,
          format: 'PDF',
          providerName,
          providerId,
        };
        await db.saveBook(newBook);
        setImportStatus({ isLoading: false, message: 'Import successful!', error: null });
        setTimeout(() => setImportStatus({ isLoading: false, message: '', error: null }), 2000);
        return { success: true };
      } catch (error) {
        logger.error('Error saving PDF:', error);
        let errorMessage = 'Failed to save the PDF file to the library.';
        if (error instanceof Error) {
          errorMessage = error.message;
        }
        setImportStatus({ isLoading: false, message: '', error: errorMessage });
        return { success: false };
      }
    }

    // Existing EPUB processing logic
    setImportStatus({ isLoading: true, message: 'Parsing EPUB...', error: null });
    try {
      const ePub = window.ePub;
      const book = ePub(bookData);
      const metadata = await book.loaded.metadata;

      setImportStatus(prev => ({ ...prev, message: 'Extracting cover...' }));
      if (!finalCoverImage) {
        const coverUrl = await book.coverUrl();
        if (coverUrl) {
          finalCoverImage = await blobUrlToBase64(coverUrl);
        }
      }

      const subjectsRaw = metadata.subject || metadata.subjects;
      const subjects = subjectsRaw ? (Array.isArray(subjectsRaw) ? subjectsRaw.map(s => typeof s === 'object' ? s.name : s) : [subjectsRaw]) : [];

      const finalProviderId = providerId || metadata.identifier;

      const newBook: BookRecord = {
        title: metadata.title || fileName,
        author: metadata.creator || 'Unknown Author',
        coverImage: finalCoverImage,
        epubData: bookData,
        publisher: metadata.publisher,
        publicationDate: metadata.pubdate,
        providerId: finalProviderId,
        providerName: providerName,
        description: metadata.description,
        subjects: subjects,
        format: 'EPUB',
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
      logger.error('Error processing EPUB:', error);
      let errorMessage = 'Failed to import the EPUB file. It might be corrupted or in an unsupported format.';
      if (error instanceof Error && error.message.includes('File is not a zip')) {
        errorMessage = "The provided file is not a valid EPUB (it's not a zip archive). Please try a different file.";
      }
      setImportStatus({ isLoading: false, message: '', error: errorMessage });
      return { success: false };
    }
  }, [handleReturnToLibrary]);

  const handleImportFromCatalog = useCallback(async (book: CatalogBook, catalogName?: string) => {
    if (book.format && book.format.toUpperCase() !== 'EPUB' && book.format.toUpperCase() !== 'PDF') {
      const error = `Cannot import this book. The application currently only supports EPUB and PDF formats, but this book is a ${book.format}.`;
      setImportStatus({ isLoading: false, message: '', error });
      return { success: false };
    }

    setImportStatus({ isLoading: true, message: `Downloading ${book.title}...`, error: null });
    try {
      // If this is an OPDS2 acquisition flow, attempt to resolve the acquisition chain
      let finalUrl = book.downloadUrl;
      try {
        // try to resolve; will throw on 401/403 so we can prompt
        const cred = await findCredentialForUrl(book.downloadUrl);
        const resolved = await resolveAcquisitionChain(book.downloadUrl, cred ? { username: cred.username, password: cred.password } : null);
        if (resolved) finalUrl = resolved;
      } catch (e: any) {
        // If auth error, prompt for credentials and allow retry
        if (e?.status === 401 || e?.status === 403) {
          setImportStatus({ isLoading: false, message: '', error: null });
          setCredentialPrompt({ isOpen: true, host: new URL(book.downloadUrl).host, pendingHref: book.downloadUrl, pendingBook: book, pendingCatalogName: catalogName });
          setCredentialPrompt(prev => ({ ...prev, authDocument: undefined }));
          return { success: false };
        }
        throw e;
      }

      const proxyUrl = await maybeProxyForCors(finalUrl);
      const storedCred = await findCredentialForUrl(book.downloadUrl);
      const downloadHeaders: Record<string, string> = {};
      if (storedCred) {
        downloadHeaders['Authorization'] = `Basic ${btoa(`${storedCred.username}:${storedCred.password}`)}`;
      }
      const response = await fetch(proxyUrl, { headers: downloadHeaders, credentials: proxyUrl === finalUrl ? 'include' : 'omit' });
      if (!response.ok) {
        const statusInfo = `${response.status}${response.statusText ? ` ${response.statusText}` : ''}`;
        let errorMessage = `Download failed. The server responded with an error (${statusInfo}). The book might not be available at this address.`;
        if (response.status === 401 || response.status === 403) {
          errorMessage = `Download failed (${statusInfo}). This catalog or book requires authentication (a login or password), which is not supported by this application.`;
        }
        if (response.status === 429) {
          errorMessage = `Download failed (${statusInfo}). The request was rate-limited by the server or the proxy. Please wait a moment and try again.`;
        }
        throw new Error(errorMessage);
      }
      const bookData = await response.arrayBuffer();
      return await processAndSaveBook(bookData, book.title, book.author, 'catalog', catalogName, book.providerId, book.format, book.coverImage);
    } catch (error) {
      logger.error('Error importing from catalog:', error);
      let message = 'Download failed. The file may no longer be available or there was a network issue.';
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        message = 'Download failed due to a network error. This could be due to your internet connection or the public CORS proxy being temporarily down.';
      } else if (error instanceof Error) {
        message = error.message;
      }
      setImportStatus({ isLoading: false, message: '', error: message });
      return { success: false };
    }
  }, [processAndSaveBook]);

  // Handler invoked by credential modal when user submits credentials
  const handleCredentialSubmit = useCallback(async (username: string, password: string, save: boolean) => {
    if (!credentialPrompt.pendingHref) {
      setCredentialPrompt({ isOpen: false, host: null, pendingHref: null, pendingBook: null });
      return;
    }
    const href = credentialPrompt.pendingHref;
    try {
      const resolved = await resolveAcquisitionChain(href, { username, password });
      if (resolved && credentialPrompt.pendingBook) {
        // Optionally save credential
        if (save && credentialPrompt.host) saveOpdsCredential(credentialPrompt.host, username, password);
        // Proceed to import using resolved URL
        setCredentialPrompt({ isOpen: false, host: null, pendingHref: null, pendingBook: null, pendingCatalogName: undefined });
        setImportStatus({ isLoading: true, message: `Downloading ${credentialPrompt.pendingBook.title}...`, error: null });
        const proxyUrl = await maybeProxyForCors(resolved);
        const downloadHeaders: Record<string, string> = {};
        // Use the credentials the user just supplied for the download
        if (username && password) downloadHeaders['Authorization'] = `Basic ${btoa(`${username}:${password}`)}`;
        const response = await fetch(proxyUrl, { headers: downloadHeaders, credentials: proxyUrl === resolved ? 'include' : 'omit' });
        if (!response.ok) {
          throw new Error(`Download failed: ${response.status}`);
        }
        const bookData = await response.arrayBuffer();
        await processAndSaveBook(bookData, credentialPrompt.pendingBook.title, credentialPrompt.pendingBook.author, 'catalog', credentialPrompt.pendingCatalogName, credentialPrompt.pendingBook.providerId, credentialPrompt.pendingBook.format, credentialPrompt.pendingBook.coverImage);
      } else {
        setImportStatus({ isLoading: false, message: '', error: 'Failed to resolve acquisition URL.' });
        setCredentialPrompt({ isOpen: false, host: null, pendingHref: null, pendingBook: null, pendingCatalogName: undefined });
        if (credentialPrompt.authDocument) {
          // Handle the authDocument as needed
        }
      }
    } catch (error) {
      logger.error('Credential resolve/import failed', error);
      setImportStatus({ isLoading: false, message: '', error: error instanceof Error ? error.message : 'Failed to authenticate and download the book.' });
      setCredentialPrompt({ isOpen: false, host: null, pendingHref: null, pendingBook: null, pendingCatalogName: undefined });
    }
  }, [credentialPrompt, processAndSaveBook]);

  // Track last auth link opened (for telemetry/testing) and provide a retry action
  const [lastAuthLinkOpened, setLastAuthLinkOpened] = useState<string | null>(null);
  const [showNetworkDebug, setShowNetworkDebug] = useState(false);

  const handleOpenAuthLink = useCallback((href: string) => {
    setLastAuthLinkOpened(href);
    // The actual window.open is already handled in the modal; we just record it here.
  }, []);

  const handleRetryAfterProviderLogin = useCallback(async () => {
    // Retry resolving the pending href if available
    if (!credentialPrompt.pendingHref || !credentialPrompt.pendingBook) return;
    setImportStatus({ isLoading: true, message: 'Retrying download after provider login...', error: null });
    try {
      const resolved = await resolveAcquisitionChain(credentialPrompt.pendingHref, null);
      if (!resolved) throw new Error('Failed to resolve after login');
      const proxyUrl = await maybeProxyForCors(resolved);
      // If the probe chose the public CORS proxy, abort and instruct the user
      // to configure an owned proxy. Public proxies (e.g., corsproxy.io) often
      // strip cookies or Authorization and will prevent successful post-login
      // downloads from Palace servers.
      if (typeof proxyUrl === 'string' && proxyUrl.includes('corsproxy.io')) {
        try { toast.pushToast('The retry would use a public CORS proxy which commonly strips authentication. Configure an owned proxy via VITE_OWN_PROXY_URL and retry.', 12000); } catch (_) { }
        throw new Error('Retry aborted: public CORS proxy would be used and may block authenticated downloads.');
      }
      const response = await fetch(proxyUrl, { credentials: proxyUrl === resolved ? 'include' : 'omit' });
      if (!response.ok) throw new Error(`Download failed: ${response.status}`);
      const bookData = await response.arrayBuffer();
      await processAndSaveBook(bookData, credentialPrompt.pendingBook.title, credentialPrompt.pendingBook.author, 'catalog', credentialPrompt.pendingCatalogName, credentialPrompt.pendingBook.providerId, credentialPrompt.pendingBook.format, credentialPrompt.pendingBook.coverImage);
      setCredentialPrompt({ isOpen: false, host: null, pendingHref: null, pendingBook: null, pendingCatalogName: undefined });
    } catch (e) {
      logger.error('Retry after provider login failed', e);
      if ((e as any)?.proxyUsed) {
        try { toast.pushToast('Retry after login failed because the request used a public CORS proxy that may strip authentication. Configure VITE_OWN_PROXY_URL to use an owned proxy that preserves credentials.', 10000); } catch (_) { }
      }
      setImportStatus({ isLoading: false, message: '', error: e instanceof Error ? e.message : 'Retry failed' });
    }
  }, [credentialPrompt, processAndSaveBook]);

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
      booksWithData,
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
      logger.error('Upload failed:', error);
      setSyncStatus({ state: 'error', message: error instanceof Error ? error.message : 'An unknown error occurred.' });
    }
  };

  const handleDownloadFromDrive = async () => {
    if (!tokenClient) return;
    const confirmed = await confirm({ message: 'DANGER: This will replace your entire local library with the version from Google Drive.\n\nAny local books or changes not uploaded to Drive will be permanently lost.\n\nAre you absolutely sure you want to continue?', title: 'Dangerous Operation', confirmLabel: 'Yes, replace', cancelLabel: 'Cancel' });
    if (!confirmed) return;

    setSyncStatus({ state: 'syncing', message: 'Downloading from Google Drive...' });
    try {
      const downloadedData = await downloadLibraryFromDrive((progressMsg) => {
        setSyncStatus({ state: 'syncing', message: progressMsg });
      });

      if (!downloadedData) {
        throw new Error('No data found in Google Drive.');
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
      logger.error('Download failed:', error);
      setSyncStatus({ state: 'error', message: error instanceof Error ? error.message : 'An unknown error occurred.' });
    }
  };


  const renderView = () => {
    switch (currentView) {
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
              activeOpdsSource={activeOpdsSource}
              setActiveOpdsSource={setActiveOpdsSource}
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
      <OpdsCredentialsModal
        isOpen={credentialPrompt.isOpen}
        host={credentialPrompt.host}
        authDocument={credentialPrompt.authDocument}
        onClose={() => setCredentialPrompt({ isOpen: false, host: null, pendingHref: null, pendingBook: null, pendingCatalogName: undefined })}
        onSubmit={handleCredentialSubmit}
        onOpenAuthLink={handleOpenAuthLink}
        onRetry={handleRetryAfterProviderLogin}
        probeUrl={credentialPrompt.pendingHref}
      />
      <NetworkDebugModal isOpen={showNetworkDebug} onClose={() => setShowNetworkDebug(false)} />
      {/** Debug floating button (visible only in debug mode) */}
      {typeof window !== 'undefined' && (window as any).__MEBOOKS_DEBUG__ && (
        <div className="fixed right-3 bottom-3 z-[60]">
          <button onClick={() => setShowNetworkDebug(true)} className="px-3 py-2 bg-yellow-400 rounded shadow">Network Debug</button>
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/debug/db" element={<DebugDbRoute />} />
      <Route path="/pdf/:id" element={
        <Suspense fallback={<div className="w-full h-full flex items-center justify-center">Loading PDF viewer...</div>}>
          <ErrorBoundary onReset={() => window.location.replace('/')} fallbackMessage="There was an error loading the PDF viewer.">
            <PdfReaderViewWrapper />
          </ErrorBoundary>
        </Suspense>
      } />
      <Route path="/*" element={<AppInner />} />
    </Routes>
  </BrowserRouter>
);

// A small wrapper to render the lazy-loaded PdfReaderView component and pass a close handler via navigation
const PdfReaderViewWrapper: React.FC = () => {
  const navigate = useNavigate();
  // Do not pass a bookId prop so PdfReaderView will read the id from the route params
  return <PdfReaderView onClose={() => navigate('/')} />;
};

export default App;

const DebugDbRoute: React.FC = () => {
  useEffect(() => {
    (async () => {
      try {
        const all = await db.getAllBooks();
        logger.debug('All books loaded from database', all);
      } catch (e) {
        logger.error('Error loading books from database', e);
      }
    })();
  }, []);

  return <div className="p-4 text-white">Debugging DB: check console for output.</div>;
};
