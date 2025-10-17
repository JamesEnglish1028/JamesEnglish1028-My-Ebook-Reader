import React, { lazy, Suspense, useCallback, useEffect, useState } from 'react';

import { QueryClient, QueryClientProvider, QueryErrorResetBoundary } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// Styles required by react-pdf layers
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';

// Component imports - using barrel exports for cleaner code
import {
  ErrorBoundary,
  ScreenReaderAnnouncer,
  SplashScreen,
  useConfirm,
  useToast,
} from './components';
// Import new LibraryView from refactored structure
// Import app-level components
import { GlobalModals, ViewRenderer } from './components/app';

// Hooks imports
import { useAuth } from './contexts/AuthContext';
import { opdsAcquisitionService } from './domain/catalog';
import { useGlobalShortcuts } from './hooks';

// Service imports - using barrel exports
import {
  db,
  downloadLibraryFromDrive,
  findCredentialForUrl,
  generatePdfCover,
  imageUrlToBase64,
  logger,
  maybeProxyForCors,
  saveOpdsCredential,
  uploadLibraryToDrive,
} from './services';
import { extractBookMetadataFromOpf } from './services/epubParser';
import { extractOpfXmlFromEpub } from './services/epubZipUtils';

// Domain service imports

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

// Create a QueryClient instance for React Query
// Configure default options for queries and mutations
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: data is fresh for 5 minutes
      staleTime: 5 * 60 * 1000,
      // Cache time: unused data is garbage collected after 10 minutes
      gcTime: 10 * 60 * 1000,
      // Retry failed queries once
      retry: 1,
      // Refetch on window focus for fresh data
      refetchOnWindowFocus: true,
      // Don't refetch on mount if data is fresh
      refetchOnMount: false,
      // Throw errors to nearest error boundary for critical failures
      // Set to false by default - individual queries can opt-in
      throwOnError: false,
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
      // Don't throw mutation errors to error boundary by default
      throwOnError: false,
    },
  },
});


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
  const [isShortcutHelpOpen, setIsShortcutHelpOpen] = useState(false);
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

  // Global keyboard shortcuts
  useGlobalShortcuts({
    shortcuts: [
      {
        key: '?',
        description: 'Show keyboard shortcuts',
        category: 'global',
        action: () => setIsShortcutHelpOpen(true),
      },
      {
        key: 'Escape',
        description: 'Close active modal or return to library',
        category: 'global',
        action: () => {
          // Close modals in priority order
          if (isShortcutHelpOpen) {
            setIsShortcutHelpOpen(false);
          } else if (isCloudSyncModalOpen) {
            setIsCloudSyncModalOpen(false);
          } else if (isLocalStorageModalOpen) {
            setIsLocalStorageModalOpen(false);
          } else if (credentialPrompt.isOpen) {
            setCredentialPrompt({ ...credentialPrompt, isOpen: false });
          } else if (currentView === 'bookDetail') {
            setCurrentView('library');
          }
          // Note: Reader views handle their own Escape key for UI elements
        },
      },
    ],
    enabled: !showSplash, // Disable shortcuts during splash screen
  });

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

    // Enhanced EPUB processing logic with OPF and accessibility metadata extraction
    setImportStatus({ isLoading: true, message: 'Extracting EPUB metadata...', error: null });
    let opfXml: string | undefined = undefined;
    let opfMetadata: any = undefined;
    let extractedCoverImage: string | null = null;
    try {

      // 1. Extract OPF XML from EPUB
      try {
        opfXml = await extractOpfXmlFromEpub(bookData);
        console.log('[processAndSaveBook] OPF XML extracted:', opfXml?.slice(0, 200));
      } catch (opfErr) {
        console.error('[processAndSaveBook] Failed to extract OPF XML:', opfErr);
        setImportStatus({ isLoading: false, message: '', error: 'Failed to extract EPUB metadata (OPF not found). Importing with minimal info.' });
      }

      // 2. Parse OPF and accessibility metadata
      if (opfXml) {
        try {
          opfMetadata = extractBookMetadataFromOpf(opfXml);
          console.log('[processAndSaveBook] OPF metadata extracted:', opfMetadata);
        } catch (parseErr) {
          console.error('[processAndSaveBook] Failed to parse OPF metadata:', parseErr);
          setImportStatus({ isLoading: false, message: '', error: 'Failed to parse EPUB metadata. Importing with minimal info.' });
        }
      }

      setImportStatus(prev => ({ ...prev, message: 'Extracting cover...' }));
      if (!finalCoverImage) {
        try {
          const { extractCoverImageFromEpub } = await import('./services/epubZipUtils');
          extractedCoverImage = await extractCoverImageFromEpub(bookData);
          if (extractedCoverImage) {
            finalCoverImage = extractedCoverImage;
            console.log('[processAndSaveBook] Cover image extracted from EPUB.');
          } else {
            console.log('[processAndSaveBook] No cover image found in EPUB.');
          }
        } catch (coverErr) {
          console.error('[processAndSaveBook] Failed to extract cover image:', coverErr);
        }
      }

      const finalProviderId = providerId || opfMetadata?.identifiers?.[0];

      // Fallback to minimal metadata if OPF extraction/parsing failed
      const newBook: BookRecord = {
        title: opfMetadata?.title || fileName,
        author: opfMetadata?.author || authorName || 'Unknown Author',
        coverImage: finalCoverImage,
        epubData: bookData,
        publisher: opfMetadata?.publisher,
        publicationDate: opfMetadata?.publicationDate,
        providerId: finalProviderId,
        providerName: providerName,
        description: opfMetadata?.description,
        subjects: opfMetadata?.subjects,
        format: 'EPUB',
        language: opfMetadata?.language,
        rights: opfMetadata?.rights,
        identifiers: opfMetadata?.identifiers,
        opfRaw: opfXml,
        accessModes: opfMetadata?.accessModes,
        accessModesSufficient: opfMetadata?.accessModesSufficient,
        accessibilityFeatures: opfMetadata?.accessibilityFeatures,
        hazards: opfMetadata?.hazards,
        accessibilitySummary: opfMetadata?.accessibilitySummary,
        certificationConformsTo: opfMetadata?.certificationConformsTo,
        certification: opfMetadata?.certification,
        accessibilityFeedback: opfMetadata?.accessibilityFeedback,
      };
      console.log('[processAndSaveBook] BookRecord to save:', newBook);

      if (finalProviderId) {
        const existing = await db.findBookByIdentifier(finalProviderId);
        if (existing) {
          setImportStatus({ isLoading: false, message: '', error: null });
          return { success: false, bookRecord: newBook, existingBook: existing };
        }
      }

      setImportStatus(prev => ({ ...prev, message: 'Saving to library...' }));
      await db.saveBook(newBook);
      console.log('[processAndSaveBook] Book saved successfully');

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
      // Skip resolution for open-access books (no authentication required)
      let finalUrl = book.downloadUrl;

      logger.info('Book isOpenAccess flag:', book.isOpenAccess, 'for book:', book.title);
      logger.info('About to call maybeProxyForCors with skipProbe=', book.isOpenAccess === true, 'for URL:', finalUrl);

      if (!book.isOpenAccess) {
        // Try to resolve acquisition chain with stored credentials
        const cred = await findCredentialForUrl(book.downloadUrl);
        const resolveResult = await opdsAcquisitionService.resolve(
          book.downloadUrl,
          'auto',
          cred ? { username: cred.username, password: cred.password } : null,
        );

        if (resolveResult.success) {
          finalUrl = resolveResult.data;
        } else {
          const errorResult = resolveResult as { success: false; error: string; status?: number; proxyUsed?: boolean };

          // If auth error (401/403), prompt for credentials and allow retry
          if (errorResult.status === 401 || errorResult.status === 403) {
            setImportStatus({ isLoading: false, message: '', error: null });
            setCredentialPrompt({ isOpen: true, host: new URL(book.downloadUrl).host, pendingHref: book.downloadUrl, pendingBook: book, pendingCatalogName: catalogName });
            setCredentialPrompt(prev => ({ ...prev, authDocument: undefined }));
            return { success: false };
          }
          // For other errors, log and continue with original URL (may fail later)
          logger.warn('Failed to resolve acquisition chain, using original URL', errorResult.error);
        }
      } else {
        logger.info('Skipping acquisition chain resolution for open-access book:', book.title);
      }

      let proxyUrl = await maybeProxyForCors(finalUrl, book.isOpenAccess === true);
      const storedCred = await findCredentialForUrl(book.downloadUrl);
      const downloadHeaders: Record<string, string> = {};
      if (storedCred) {
        downloadHeaders['Authorization'] = `Basic ${btoa(`${storedCred.username}:${storedCred.password}`)}`;
      }

      // For open-access books, try direct fetch first (with credentials for cookies)
      // If CORS blocks it, fall back to proxy
      let response: Response;
      if (book.isOpenAccess) {
        try {
          console.log('[App] Attempting direct fetch for open-access book:', finalUrl);
          console.log('[App] Book downloadUrl from catalog:', book.downloadUrl);
          console.log('[App] Download headers:', downloadHeaders);
          response = await fetch(finalUrl, { headers: downloadHeaders, credentials: 'include', redirect: 'follow' });
          console.log('[App] Direct fetch succeeded, status:', response.status, 'final URL:', response.url);
        } catch (directError) {
          console.log('[App] Direct fetch failed (likely CORS), trying proxy:', directError);
          // Direct fetch failed, use proxy as fallback
          // For open-access, don't do HEAD probe since it returns 401
          proxyUrl = await maybeProxyForCors(finalUrl, true); // Skip probe
          console.log('[App] Using proxy URL:', proxyUrl);
          response = await fetch(proxyUrl, { headers: {}, credentials: 'omit', redirect: 'follow' }); // No auth headers for proxy
          console.log('[App] Proxy fetch completed, status:', response.status, 'final URL:', response.url);
        }
      } else {
        response = await fetch(proxyUrl, { headers: downloadHeaders, credentials: proxyUrl === finalUrl ? 'include' : 'omit' });
      }
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
      const resolveResult = await opdsAcquisitionService.resolve(href, 'auto', { username, password });

      if (resolveResult.success && credentialPrompt.pendingBook) {
        // Optionally save credential
        if (save && credentialPrompt.host) saveOpdsCredential(credentialPrompt.host, username, password);
        // Proceed to import using resolved URL
        setCredentialPrompt({ isOpen: false, host: null, pendingHref: null, pendingBook: null, pendingCatalogName: undefined });
        setImportStatus({ isLoading: true, message: `Downloading ${credentialPrompt.pendingBook.title}...`, error: null });
        const proxyUrl = await maybeProxyForCors(resolveResult.data);
        const downloadHeaders: Record<string, string> = {};
        // Use the credentials the user just supplied for the download
        if (username && password) downloadHeaders['Authorization'] = `Basic ${btoa(`${username}:${password}`)}`;
        const response = await fetch(proxyUrl, { headers: downloadHeaders, credentials: proxyUrl === resolveResult.data ? 'include' : 'omit' });
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
      const resolveResult = await opdsAcquisitionService.resolve(credentialPrompt.pendingHref, 'auto', null);

      if (!resolveResult.success) {
        throw new Error('Failed to resolve after login');
      }

      const proxyUrl = await maybeProxyForCors(resolveResult.data);
      // If the probe chose the public CORS proxy, abort and instruct the user
      // to configure an owned proxy. Public proxies (e.g., corsproxy.io) often
      // strip cookies or Authorization and will prevent successful post-login
      // downloads from Palace servers.
      if (typeof proxyUrl === 'string' && proxyUrl.includes('corsproxy.io')) {
        try { toast.pushToast('The retry would use a public CORS proxy which commonly strips authentication. Configure an owned proxy via VITE_OWN_PROXY_URL and retry.', 12000); } catch (_) { }
        throw new Error('Retry aborted: public CORS proxy would be used and may block authenticated downloads.');
      }
      const response = await fetch(proxyUrl, { credentials: proxyUrl === resolveResult.data ? 'include' : 'omit' });
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


  console.log('[AppInner] render', { currentView, activeOpdsSource });
  return (
    <div className="min-h-screen bg-slate-900 font-sans">
      {/* Skip link for keyboard navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-sky-500 focus:text-white focus:rounded-md focus:font-semibold focus:shadow-lg"
      >
        Skip to main content
      </a>
      <SplashScreen isVisible={showSplash} />
      {!showSplash && (
        <main id="main-content">
          <ViewRenderer
            currentView={currentView}
            selectedBookId={selectedBookId}
            coverAnimationData={coverAnimationData}
            onCloseReader={handleCloseReader}
            detailViewData={detailViewData}
            onReturnToLibrary={handleReturnToLibrary}
            onReadBook={handleOpenBook}
            onImportFromCatalog={handleImportFromCatalog}
            onOpenBook={handleOpenBook}
            onShowBookDetail={handleShowBookDetail}
            processAndSaveBook={processAndSaveBook}
            activeOpdsSource={activeOpdsSource}
            setActiveOpdsSource={setActiveOpdsSource}
            catalogNavPath={catalogNavPath}
            setCatalogNavPath={setCatalogNavPath}
            onOpenCloudSyncModal={() => setIsCloudSyncModalOpen(true)}
            onOpenLocalStorageModal={() => setIsLocalStorageModalOpen(true)}
            onShowAbout={handleShowAbout}
            importStatus={importStatus}
            setImportStatus={setImportStatus}
          />
        </main>
      )}
      <GlobalModals
        isCloudSyncModalOpen={isCloudSyncModalOpen}
        onCloseCloudSyncModal={() => setIsCloudSyncModalOpen(false)}
        onUploadToDrive={handleUploadToDrive}
        onDownloadFromDrive={handleDownloadFromDrive}
        syncStatus={syncStatus}
        setSyncStatus={setSyncStatus}
        isLocalStorageModalOpen={isLocalStorageModalOpen}
        onCloseLocalStorageModal={() => setIsLocalStorageModalOpen(false)}
        credentialPrompt={credentialPrompt}
        onCloseCredentialPrompt={() => setCredentialPrompt({ isOpen: false, host: null, pendingHref: null, pendingBook: null, pendingCatalogName: undefined, authDocument: null })}
        onCredentialSubmit={handleCredentialSubmit}
        onOpenAuthLink={handleOpenAuthLink}
        onRetryAfterProviderLogin={handleRetryAfterProviderLogin}
        showNetworkDebug={showNetworkDebug}
        onCloseNetworkDebug={() => setShowNetworkDebug(false)}
        onOpenNetworkDebug={() => setShowNetworkDebug(true)}
        isShortcutHelpOpen={isShortcutHelpOpen}
        onCloseShortcutHelp={() => setIsShortcutHelpOpen(false)}
      />

      {/* Screen reader announcements for async operations */}
      <ScreenReaderAnnouncer
        message={importStatus.isLoading ? importStatus.message : importStatus.error || null}
        politeness={importStatus.error ? 'assertive' : 'polite'}
      />
      <ScreenReaderAnnouncer
        message={syncStatus.state !== 'idle' ? syncStatus.message : null}
        politeness={syncStatus.state === 'error' ? 'assertive' : 'polite'}
      />
    </div>
  );
};

const App: React.FC = () => (
  <QueryClientProvider client={queryClient}>
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <BrowserRouter>
          <Routes>
            <Route path="/debug/db" element={<DebugDbRoute />} />
            <Route path="/pdf/:id" element={
              <Suspense fallback={<div className="w-full h-full flex items-center justify-center">Loading PDF viewer...</div>}>
                <ErrorBoundary onReset={() => { reset(); window.location.replace('/'); }} fallbackMessage="There was an error loading the PDF viewer.">
                  <PdfReaderViewWrapper />
                </ErrorBoundary>
              </Suspense>
            } />
            <Route path="/*" element={
              <ErrorBoundary onReset={() => { reset(); window.location.reload(); }} fallbackMessage="There was an error loading the application.">
                <AppInner />
              </ErrorBoundary>
            } />
          </Routes>
        </BrowserRouter>
      )}
    </QueryErrorResetBoundary>
    {/* React Query DevTools - only visible in development */}
    <ReactQueryDevtools initialIsOpen={false} />
  </QueryClientProvider>
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
