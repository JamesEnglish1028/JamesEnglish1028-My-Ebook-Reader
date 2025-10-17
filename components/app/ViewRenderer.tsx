import React from 'react';

import {
  AboutPage,
  BookDetailView,
  ErrorBoundary,
  ReaderView,
} from '..';
import type {
  BookMetadata,
  BookRecord,
  Catalog,
  CatalogBook,
  CatalogRegistry,
  CoverAnimationData,
} from '../../types';
import LibraryView from '../library/LibraryView';


interface ViewRendererProps {
  currentView: 'library' | 'reader' | 'pdfReader' | 'bookDetail' | 'about';

  // Reader view props
  selectedBookId: number | null;
  coverAnimationData: CoverAnimationData | null;
  onCloseReader: () => void;

  // Book detail view props
  detailViewData: {
    book: BookMetadata | CatalogBook;
    source: 'library' | 'catalog';
    catalogName?: string;
  } | null;
  onReturnToLibrary: () => void;
  onReadBook: (id: number, animationData: CoverAnimationData, format?: string) => void;
  onImportFromCatalog: (book: CatalogBook, catalogName?: string) => Promise<{ success: boolean; bookRecord?: BookRecord; existingBook?: BookRecord }>;

  // Library view props
  onOpenBook: (id: number, animationData: CoverAnimationData, format?: string) => void;
  onShowBookDetail: (book: BookMetadata | CatalogBook, source: 'library' | 'catalog', catalogName?: string) => void;
  processAndSaveBook: (
    bookData: ArrayBuffer,
    fileName?: string,
    authorName?: string,
    source?: 'file' | 'catalog',
    providerName?: string,
    providerId?: string,
    format?: string,
    coverImageUrl?: string | null,
  ) => Promise<{ success: boolean; bookRecord?: BookRecord; existingBook?: BookRecord }>;
  activeOpdsSource: Catalog | CatalogRegistry | null;
  setActiveOpdsSource: (source: Catalog | CatalogRegistry | null) => void;
  catalogNavPath: { name: string; url: string }[];
  setCatalogNavPath: (path: { name: string; url: string }[]) => void;
  onOpenCloudSyncModal: () => void;
  onOpenLocalStorageModal: () => void;
  onShowAbout: () => void;

  // Import status (shared between views)
  importStatus: {
    isLoading: boolean;
    message: string;
    error: string | null;
  };
  setImportStatus: React.Dispatch<React.SetStateAction<{
    isLoading: boolean;
    message: string;
    error: string | null;
  }>>;
}

/**
 * ViewRenderer component handles the routing/view switching logic for the app.
 * It renders the appropriate view based on currentView state and passes necessary props.
 */
export const ViewRenderer: React.FC<ViewRendererProps> = ({
  currentView,
  selectedBookId,
  coverAnimationData,
  onCloseReader,
  detailViewData,
  onReturnToLibrary,
  onReadBook,
  onImportFromCatalog,
  onOpenBook,
  onShowBookDetail,
  processAndSaveBook,
  activeOpdsSource,
  setActiveOpdsSource,
  catalogNavPath,
  setCatalogNavPath,
  onOpenCloudSyncModal,
  onOpenLocalStorageModal,
  onShowAbout,
  importStatus,
  setImportStatus,
}) => {
  switch (currentView) {
    case 'reader':
      return selectedBookId !== null ? (
        <ErrorBoundary
          onReset={onCloseReader}
          fallbackMessage="There was an error while trying to display this book. Returning to the library."
        >
          <ReaderView
            bookId={selectedBookId}
            onClose={onCloseReader}
            animationData={coverAnimationData}
          />
        </ErrorBoundary>
      ) : null;

    case 'bookDetail':
      return detailViewData ? (
        <ErrorBoundary
          onReset={onReturnToLibrary}
          fallbackMessage="There was an error showing the book details. Returning to the library."
        >
          <BookDetailView
            book={detailViewData.book}
            source={detailViewData.source}
            catalogName={detailViewData.catalogName}
            onBack={onReturnToLibrary}
            onReadBook={onReadBook}
            onImportFromCatalog={onImportFromCatalog}
            importStatus={importStatus}
            setImportStatus={setImportStatus}
          />
        </ErrorBoundary>
      ) : null;

    case 'about':
      return <AboutPage onBack={onReturnToLibrary} />;

    case 'library':
    default:
      return (
        <ErrorBoundary
          onReset={() => window.location.reload()}
          fallbackMessage="There was a critical error in the library. Please try reloading the application."
        >
          <LibraryView
            onOpenBook={onOpenBook}
            onShowBookDetail={onShowBookDetail}
            processAndSaveBook={processAndSaveBook}
            importStatus={importStatus}
            setImportStatus={setImportStatus}
            activeOpdsSource={activeOpdsSource}
            setActiveOpdsSource={setActiveOpdsSource}
            catalogNavPath={catalogNavPath}
            setCatalogNavPath={setCatalogNavPath}
            onOpenCloudSyncModal={onOpenCloudSyncModal}
            onOpenLocalStorageModal={onOpenLocalStorageModal}
            onShowAbout={onShowAbout}
          />
        </ErrorBoundary>
      );
  }
};
