import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { mebooksBook } from '../assets';
import { bookRepository } from '../domain/book';
import { SORT_OPTIONS, useCatalogs, useLocalStorage, useSortedBooks } from '../hooks';
import { db } from '../services/db';
import { logger } from '../services/logger';
import { fetchCatalogContent, filterBooksByFiction, filterBooksByMedia, getAvailableAudiences, getAvailableCategories, getAvailableCollections, getAvailableFictionModes, getAvailableMediaModes, groupBooksByMode } from '../services/opds';
import { proxiedUrl } from '../services/utils';
import type { AudienceMode, BookMetadata, BookRecord, Catalog, CatalogBook, CatalogNavigationLink, CatalogPagination, CatalogRegistry, CategorizationMode, CategoryLane, Collection, CollectionGroup, CollectionMode, CoverAnimationData, FictionMode, MediaMode } from '../types';

import { CategoryLaneComponent } from './CategoryLane';
import { CollectionLane } from './CollectionLane';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import DuplicateBookModal from './DuplicateBookModal';
import { AdjustmentsVerticalIcon, CheckIcon, ChevronDownIcon, ChevronRightIcon, FolderIcon, FolderOpenIcon, GlobeIcon, LeftArrowIcon, PlusIcon, RightArrowIcon, SettingsIcon, TrashIcon, UploadIcon } from './icons';
import ManageCatalogsModal from './ManageCatalogsModal';
import Spinner from './Spinner';
import { UncategorizedLane } from './UncategorizedLane';

// All logic, hooks, and rendering should be inside the Library component below

const Library: React.FC = () => {
  const [activeOpdsSource, setActiveOpdsSource] = useState<Catalog | null>(null);
  const [catalogNavPath, setCatalogNavPath] = useState<{ name: string, url: string }[]>([]);
  const [libraryRefreshFlag, setLibraryRefreshFlag] = useState(0);
  const [isCatalogDropdownOpen, setIsCatalogDropdownOpen] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const [bookToDelete, setBookToDelete] = useState<BookRecord | null>(null);
  const [duplicateBook, setDuplicateBook] = useState<BookMetadata | null>(null);
  const [existingBook, setExistingBook] = useState<BookMetadata | null>(null);
  const [importStatus, setImportStatus] = useState<{ isLoading: boolean, message: string, error: string | null }>({ isLoading: false, message: '', error: null });

  const {
    catalogs,
    registries,
    isCatalogLoading,
    fetchBooks,
    fetchAndParseSource,
    sortedBooks,
    setSortOrder,
    catalogNavLinks,
    setCatalogNavLinks,
    catalogPagination,
    setCatalogNavPath: setCatalogNavPathHook,
  } = useCatalogs();

  const {
    uiTheme,
    setUiTheme,
    onOpenLocalStorageModal,
    onOpenCloudSyncModal,
    onShowAbout,
  } = useLocalStorage();

  // DEBUG: Monitor categoryLanes data
  const handleSelectSource = useCallback((source: 'library' | Catalog | CatalogRegistry) => {
    setIsCatalogDropdownOpen(false);
    if (source === 'library') {
      setActiveOpdsSource(null);
      setCatalogNavPath([]); // Ensure nav path is reset for My Library
      // ...existing code...
      setCategorizationMode('subject');
      setAudienceMode('all');
      setFictionMode('all');
      setMediaMode('all');
      setCollectionMode('all');
      setRootLevelCollections([]);
      setCollectionLinks([]);
      setCatalogCollections([]);
      setShowCollectionView(false);
    } else if (activeOpdsSource?.id !== source.id) {
      setCategorizationMode('subject');
      setAudienceMode('all');
      setFictionMode('all');
      setMediaMode('all');
      setCollectionMode('all');
      setRootLevelCollections([]);
      setCollectionLinks([]);
      setCatalogCollections([]);
      setShowCollectionView(false);
      setActiveOpdsSource(source);
      setCatalogNavPath([{ name: source.name, url: source.url }]);
    }
  }, [activeOpdsSource?.id, setActiveOpdsSource, setCatalogNavPath]);

  // Catalogs and registries are now managed by useCatalogs hook
  // Migration logic moved to the hook itself

  useEffect(() => {
    console.log('[Library] useEffect (books refresh) triggered', {
      activeOpdsSource,
      catalogNavPath,
      libraryRefreshFlag
    });
    // Always refetch books when switching to My Library, when refresh flag changes, or on mount
    if (!activeOpdsSource) {
      console.log('[Library] No activeOpdsSource, calling fetchBooks()');
      fetchBooks();
      return;
    }
    if (catalogNavPath.length === 0) {
      console.log('[Library] catalogNavPath empty, setting initial path');
      setCatalogNavPath([{ name: activeOpdsSource.name, url: activeOpdsSource.url }]);
    } else {
      const currentPath = catalogNavPath[catalogNavPath.length - 1];
      console.log('[Library] Navigating catalog, calling fetchAndParseSource', currentPath.url, activeOpdsSource.url);
      fetchAndParseSource(currentPath.url, activeOpdsSource.url);
    }
    // Force fetchBooks on every mount of Library view
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOpdsSource, catalogNavPath, fetchAndParseSource, fetchBooks, setCatalogNavPath, libraryRefreshFlag]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCatalogDropdownOpen(false);
      }
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setIsSortDropdownOpen(false);
      }
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
        setIsSettingsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePaginationClick = (url: string) => {
    setCatalogNavPath(prev => {
      if (prev.length === 0) return prev;
      const newPath = [...prev];
      const lastItem = { ...newPath[newPath.length - 1], url };
      newPath[newPath.length - 1] = lastItem;
      return newPath;
    });
  };

  const handleNavLinkClick = (link: { title: string, url: string }) => {
    // Reset filters when navigating to a new catalog section
    setCategorizationMode('subject');
    setAudienceMode('all');
    setFictionMode('all');
    setMediaMode('all');
    setCatalogNavPath(prev => [...prev, { name: link.title, url: link.url }]);
  };

  const handleBreadcrumbClick = (index: number) => {
    // Reset filters when navigating via breadcrumbs
    setCategorizationMode('subject');
    setAudienceMode('all');
    setFictionMode('all');
    setMediaMode('all');

    // Update navigation path
    const newPath = catalogNavPath.slice(0, index + 1);
    setCatalogNavPath(newPath);

    // Update collection mode to sync with breadcrumb navigation
    if (newPath.length <= 1) {
      // Back to root - show all collections
      setCollectionMode('all');
    } else {
      // Inside a collection - set collection mode to current navigation item
      const currentCollection = newPath[newPath.length - 1].name;
      setCollectionMode(currentCollection as CollectionMode);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportStatus({ isLoading: true, message: 'Reading file...', error: null });
    const reader = new FileReader();
    reader.onload = async (e) => {
      const epubData = e.target?.result as ArrayBuffer;
      if (epubData) {
        let format = 'EPUB';
        if (file.name.toLowerCase().endsWith('.pdf')) {
          format = 'PDF';
        }
        const result = await processAndSaveBook(epubData, file.name, undefined, 'file', undefined, undefined, format, null);
        if (!result.success && result.bookRecord && result.existingBook) {
          setDuplicateBook(result.bookRecord);
          setExistingBook(result.existingBook);
        } else if (result.success && !activeOpdsSource) {
          fetchBooks();
        }
      } else {
        setImportStatus({ isLoading: false, message: '', error: 'Could not read file data.' });
      }
      event.target.value = '';
    };
    reader.onerror = () => {
      setImportStatus({ isLoading: false, message: '', error: 'An error occurred while trying to read the file.' });
    };
    reader.readAsArrayBuffer(file);
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
      setTimeout(() => setImportStatus({ isLoading: false, message: '', error: null }), 2000);
      if (!activeOpdsSource) {
        fetchBooks();
      }
    } catch (error) {
      logger.error('Error replacing book:', error);
      setImportStatus({ isLoading: false, message: '', error: 'Failed to replace the book in the library.' });
    }
  }, [duplicateBook, existingBook, activeOpdsSource, fetchBooks, setImportStatus]);

  const handleAddAnyway = useCallback(async () => {
    if (!duplicateBook) return;

    setImportStatus({ isLoading: true, message: 'Saving new copy...', error: null });
    const bookToSave = { ...duplicateBook };

    setDuplicateBook(null);
    setExistingBook(null);

    try {
      await db.saveBook(bookToSave);
      setImportStatus({ isLoading: false, message: 'Import successful!', error: null });
      setTimeout(() => setImportStatus({ isLoading: false, message: '', error: null }), 2000);
      if (!activeOpdsSource) {
        fetchBooks();
      }
    } catch (error) {
      logger.error('Error adding duplicate book:', error);
      setImportStatus({ isLoading: false, message: '', error: 'Failed to add the new copy to the library.' });
    }
  }, [duplicateBook, activeOpdsSource, fetchBooks, setImportStatus]);

  const handleCancelDuplicate = () => {
    setDuplicateBook(null);
    setExistingBook(null);
    setImportStatus({ isLoading: false, message: '', error: null });
  };

  const handleLocalBookClick = async (book: BookMetadata) => {
    if (book.id) {
      const fullBookMetadata = await db.getBookMetadata(book.id);
      if (!fullBookMetadata) {
        logger.error('Could not find book details for ID:', book.id);
        return;
      }
      onShowBookDetail(fullBookMetadata, 'library');
    }
  };

  const handleCatalogBookClick = (book: CatalogBook) => {
    onShowBookDetail(book, 'catalog', activeOpdsSource?.name);
  };

  // Collection navigation with smooth transitions
  const handleToggleCategoryView = useCallback(async () => {
    setIsTransitioning(true);
    await new Promise(resolve => setTimeout(resolve, 150));
    setShowCategoryView(!showCategoryView);
    setIsTransitioning(false);
  }, [showCategoryView]);

  const handleToggleCollectionView = useCallback(async () => {
    setIsTransitioning(true);
    await new Promise(resolve => setTimeout(resolve, 150));
    setShowCollectionView(!showCollectionView);
    setIsTransitioning(false);
  }, [showCollectionView]);

  const handleCollectionClick = useCallback(async (collection: Collection) => {
    if (activeOpdsSource) {
      // Reset filters when navigating to a new collection to avoid conflicts
      setCategorizationMode('subject'); // Reset to default
      setAudienceMode('all'); // Reset to show all audiences
      setFictionMode('all'); // Reset to show all fiction types
      setMediaMode('all'); // Reset to show all media types

      // Navigate to the collection's catalog by updating the navigation path
      const newNavPath = [...catalogNavPath, { name: collection.title, url: collection.href }];
      setCatalogNavPath(newNavPath);
      // Fetch and parse the collection content
      await fetchAndParseSource(collection.href, activeOpdsSource.url);
    }
  }, [activeOpdsSource, catalogNavPath, setCatalogNavPath, fetchAndParseSource]);

  const handleToggleNode = useCallback(async (nodeUrl: string) => {
    const findAndUpdateNode = async (nodes: CatalogNavigationLink[]): Promise<CatalogNavigationLink[]> => {
      const newNodes = [...nodes];
      for (let i = 0; i < newNodes.length; i++) {
        const node = newNodes[i];
        if (node.url === nodeUrl) {
          if (node.isExpanded) {
            newNodes[i] = { ...node, isExpanded: false };
            return newNodes;
          }

          if (node.children) {
            newNodes[i] = { ...node, isExpanded: true };
            return newNodes;
          }

          newNodes[i] = { ...node, isLoading: true };
          setCatalogNavLinks(prevLinks => {
            const linksCopy = JSON.parse(JSON.stringify(prevLinks));
            const findAndUpdate = (links: CatalogNavigationLink[]): boolean => {
              for (const link of links) {
                if (link.url === nodeUrl) {
                  link.isLoading = true;
                  return true;
                }
                if (link.children && findAndUpdate(link.children)) return true;
              }
              return false;
            };
            findAndUpdate(linksCopy);
            return linksCopy;
          });

          const baseUrl = activeOpdsSource?.url;
          const forcedVersion2 = (activeOpdsSource && 'opdsVersion' in activeOpdsSource) ? (activeOpdsSource as any).opdsVersion || 'auto' : 'auto';
          // Diagnostic: log forcedVersion when expanding navigation nodes
          logger.debug('[mebooks] fetchCatalogContent (nav children) - forcedVersion:', forcedVersion2, 'node:', node.url);
          const { navLinks: newChildren, error } = await fetchCatalogContent(node.url, baseUrl || node.url, forcedVersion2 as any);

          if (error) {
            logger.error(`Error fetching children for ${node.title}:`, error);
            newNodes[i] = { ...node, isLoading: false, _hasFetchedChildren: true, _canExpand: false };
          } else {
            const canExpand = newChildren.length > 0;
            newNodes[i] = {
              ...node,
              isLoading: false,
              isExpanded: canExpand,
              children: canExpand ? newChildren : undefined,
              _hasFetchedChildren: true,
              _canExpand: canExpand,
            };
          }
          return newNodes;
        }

        if (node.children) {
          const updatedChildren = await findAndUpdateNode(node.children);
          if (updatedChildren !== node.children) {
            newNodes[i] = { ...node, children: updatedChildren };
            return newNodes;
          }
        }
      }
      return newNodes;
    };

    const updatedLinks = await findAndUpdateNode(catalogNavLinks);
    setCatalogNavLinks(updatedLinks);
  }, [activeOpdsSource, catalogNavLinks]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!bookToDelete || typeof bookToDelete.id === 'undefined') return;

    try {
      const result = await bookRepository.delete(bookToDelete.id);

      if (result.success) {
        setBooks(prevBooks => prevBooks.filter(b => b.id !== bookToDelete.id));
      } else {
        logger.error('Failed to delete book:', (result as { success: false; error: string }).error);
      }
    } catch (error) {
      logger.error('Failed to delete book:', error);
    } finally {
      setBookToDelete(null);
    }
  }, [bookToDelete]);

  const handleSortChange = (newSortOrder: string) => {
    setSortOrder(newSortOrder); // useLocalStorage hook auto-persists
    setIsSortDropdownOpen(false);
  };

  const OpdsNavigationItem: React.FC<{
    link: CatalogNavigationLink;
    level: number;
    onToggle: (url: string) => void;
    onNavigate: (link: { title: string, url: string }) => void;
    currentPath: { name: string; url: string }[];
  }> = ({ link, level, onToggle, onNavigate, currentPath }) => {
  const indentation = 1.5 + (level * 1.5);
    const isAlreadyAdded = catalogs.some(c => c.url === link.url);
    const isCatalogLink = !!link.isCatalog;

    // A catalog link is a terminal node in the discovery tree; it doesn't expand further.
    // A regular navigation link can be expanded if we haven't checked for children yet, or if it has children.
    const canToggle = !isCatalogLink && (!link._hasFetchedChildren || !!link._canExpand);

    const handleAdd = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!isAlreadyAdded) {
        handleAddCatalog(link.title, link.url);
      }
    };

    const renderIcon = () => {
      if (isCatalogLink) {
        return <GlobeIcon className="w-5 h-5 text-sky-500" />;
      }
      if (link.isLoading) {
        return <Spinner size="small" />;
      }
      return (
        <button
          onClick={(e) => { e.stopPropagation(); if (canToggle) onToggle(link.url); }}
          className={`p-1 ${canToggle ? '' : 'opacity-30 cursor-default'}`}
          aria-label={link.isExpanded ? `Collapse ${link.title}` : `Expand ${link.title}`}
          disabled={!canToggle}
        >
          {link.isExpanded ? <FolderOpenIcon className="w-5 h-5 text-sky-500" /> : <FolderIcon className="w-5 h-5 text-slate-200" />}
        </button>
      );
    };

    // Check if this navigation item is currently active (matches current path)
    <div className="container mx-auto p-4 md:p-8">
      <header className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
        <div className="flex items-center gap-4">
          <img src={mebooksBook} alt="MeBooks Logo" className="w-10 h-10 flex-shrink-0" />
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            {currentTitle}
          </h1>
        </div>
      </header>
      {/* Breadcrumbs */}
      {isBrowsingOpds && catalogNavPath.length > 0 && (
        <nav aria-label="breadcrumb" className="flex items-center text-sm text-slate-400 mb-4 flex-wrap">
          {catalogNavPath.map((item, index) => (
            <React.Fragment key={index}>
              <button
                onClick={() => handleBreadcrumbClick(index)}
                className={`hover:text-sky-400 ${index === catalogNavPath.length - 1 ? 'font-semibold text-white' : ''}`}
              >
                {item.name}
              </button>
              {index < catalogNavPath.length - 1 && <ChevronRightIcon className="w-4 h-4 mx-1 flex-shrink-0" />}
            </React.Fragment>
          ))}
        </nav>
      )}
      {/* Category Navigation */}
      {isBrowsingOpds && (availableGenreCategories.length > 0 || availableAudiences.length > 1 || availableFictionModes.length > 1) && (
        <div className="bg-slate-800/50 rounded-lg p-4 mb-6">
          {/* ...existing code for category navigation and filters... */}
    // ...existing code...
  }, [originalCatalogBooks, catalogNavLinks, catalogPagination, categorizationMode, audienceMode, fictionMode, mediaMode, collectionMode]);
        <div className="fixed inset-0 bg-slate-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 p-8 rounded-lg shadow-xl text-center max-w-sm w-full">
            {importStatus.isLoading && !importStatus.error && <Spinner text={importStatus.message} />}
            {importStatus.message === 'Import successful!' && !importStatus.isLoading && (
              <div className="flex flex-col items-center">
                <h3 className="text-xl font-bold text-green-400 mb-4">Success</h3>
                <p className="text-slate-300 mb-6">Book imported successfully!</p>
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
      {/* Main Content Area with Sidebar Layout */}
      {isBrowsingOpds ? (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          {(availableCollections.length > 0 || (catalogNavPath.length > 1 && rootLevelCollections.length > 0) || (isCatalogLoading && rootLevelCollections.length > 0) || audienceLinks.length > 0) && (
            <aside className="w-full lg:w-64 lg:flex-shrink-0 order-2 lg:order-1">
              <div className="bg-slate-800/50 rounded-lg p-4 lg:sticky lg:top-4">
                <h3 className="text-lg font-semibold text-white mb-4">Navigation By</h3>
                {/* ...existing code for collections accordion... */}
              </div>
            </aside>
          )}
          {/* Main Content */}
          <main className={`flex-1 min-w-0 order-1 lg:order-2 ${availableCollections.length === 0 ? '' : ''}`}>
            {renderCurrentView()}
          </main>
        </div>
      ) : (
        renderCurrentView()
      )}
      {/* Modals */}
      <ManageCatalogsModal
        isOpen={isManageCatalogsOpen}
        onClose={() => setIsManageCatalogsOpen(false)}
        catalogs={catalogs}
        onAddCatalog={handleAddCatalog}
        onDeleteCatalog={handleDeleteCatalog}
        onUpdateCatalog={handleUpdateCatalog}
        registries={registries}
        onAddRegistry={handleAddRegistry}
        onDeleteRegistry={handleDeleteRegistry}
        onUpdateRegistry={handleUpdateRegistry}
      />
      <DuplicateBookModal
        isOpen={!!duplicateBook}
        onClose={handleCancelDuplicate}
        onReplace={handleReplaceBook}
        onAddAnyway={handleAddAnyway}
        bookTitle={duplicateBook?.title || ''}
      />
      <DeleteConfirmationModal
        isOpen={!!bookToDelete}
        onClose={() => setBookToDelete(null)}
        onConfirm={handleDeleteConfirm}
        bookTitle={bookToDelete?.title || ''}
      />
    </div>
  );
};

export default Library;
