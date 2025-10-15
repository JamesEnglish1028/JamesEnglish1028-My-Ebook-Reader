import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { bookRepository } from '../domain/book';
import { SORT_OPTIONS, useCatalogs, useLocalStorage, useSortedBooks } from '../hooks';
import { db } from '../services/db';
import { logger } from '../services/logger';
import { fetchCatalogContent, filterBooksByAudience, filterBooksByFiction, filterBooksByMedia, getAvailableAudiences, getAvailableCategories, getAvailableCollections, getAvailableFictionModes, getAvailableMediaModes, groupBooksByMode } from '../services/opds';
import { proxiedUrl } from '../services/utils';
import type { AudienceMode, BookMetadata, BookRecord, Catalog, CatalogBook, CatalogNavigationLink, CatalogPagination, CatalogRegistry, CategorizationMode, CategoryLane, Collection, CollectionGroup, CollectionMode, CoverAnimationData, FictionMode, MediaMode } from '../types';

import { CategoryLaneComponent } from './CategoryLane';
import { CollectionLane } from './CollectionLane';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import DuplicateBookModal from './DuplicateBookModal';
import { AdjustmentsVerticalIcon, CheckIcon, ChevronDownIcon, ChevronRightIcon, FolderIcon, FolderOpenIcon, GlobeIcon, LeftArrowIcon, PlusIcon, RightArrowIcon, SettingsIcon, TrashIcon, UploadIcon } from './icons';
import { mebooksBook } from '../assets';
import ManageCatalogsModal from './ManageCatalogsModal';
import Spinner from './Spinner';
import { UncategorizedLane } from './UncategorizedLane';

interface LibraryProps {
  onOpenBook: (id: number, animationData: CoverAnimationData, format?: string) => void;
  onShowBookDetail: (book: BookMetadata | CatalogBook, source: 'library' | 'catalog', catalogName?: string) => void;
  processAndSaveBook: (
    epubData: ArrayBuffer,
    fileName?: string,
    authorName?: string,
    source?: 'file' | 'catalog',
    providerName?: string,
    providerId?: string,
    format?: string,
    coverImageUrl?: string | null
  ) => Promise<{ success: boolean; bookRecord?: BookRecord, existingBook?: BookRecord }>;
  importStatus: { isLoading: boolean; message: string; error: string | null; };
  setImportStatus: React.Dispatch<React.SetStateAction<{ isLoading: boolean; message: string; error: string | null; }>>;
  activeOpdsSource: Catalog | CatalogRegistry | null;
  setActiveOpdsSource: React.Dispatch<React.SetStateAction<Catalog | CatalogRegistry | null>>;
  catalogNavPath: { name: string, url: string }[];
  setCatalogNavPath: React.Dispatch<React.SetStateAction<{ name: string, url: string }[]>>;
  onOpenCloudSyncModal: () => void;
  onOpenLocalStorageModal: () => void;
  onShowAbout: () => void;
}

const Library: React.FC<LibraryProps> = ({
  onOpenBook,
  onShowBookDetail,
  processAndSaveBook,
  importStatus,
  setImportStatus,
  activeOpdsSource,
  setActiveOpdsSource,
  catalogNavPath,
  setCatalogNavPath,
  onOpenCloudSyncModal,
  onOpenLocalStorageModal,
  onShowAbout,
}) => {
  const [books, setBooks] = useState<BookMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Use custom hook for catalog management
  const {
    catalogs,
    registries,
    addCatalog: handleAddCatalogHook,
    deleteCatalog: handleDeleteCatalogHook,
    updateCatalog: handleUpdateCatalogHook,
    addRegistry: handleAddRegistryHook,
    deleteRegistry: handleDeleteRegistryHook,
    updateRegistry: handleUpdateRegistryHook,
  } = useCatalogs();

  const [catalogBooks, setCatalogBooks] = useState<CatalogBook[]>([]);
  const [originalCatalogBooks, setOriginalCatalogBooks] = useState<CatalogBook[]>([]); // Unfiltered books for availability checks
  const [catalogNavLinks, setCatalogNavLinks] = useState<CatalogNavigationLink[]>([]);
  const [catalogPagination, setCatalogPagination] = useState<CatalogPagination | null>(null);

  // Collection-based organization state
  const [catalogCollections, setCatalogCollections] = useState<CollectionGroup[]>([]);
  const [uncategorizedBooks, setUncategorizedBooks] = useState<CatalogBook[]>([]);
  const [showCollectionView, setShowCollectionView] = useState(false);

  // Persist root-level collections for sidebar navigation
  const [rootLevelCollections, setRootLevelCollections] = useState<string[]>([]);

  // Category-based organization state (with smooth transitions)
  const [categoryLanes, setCategoryLanes] = useState<CategoryLane[]>([]);
  const [collectionLinks, setCollectionLinks] = useState<Collection[]>([]);
  const [showCategoryView, setShowCategoryView] = useState(false);
  // Audience navigation links for sidebar
  const [audienceLinks, setAudienceLinks] = useState<CatalogNavigationLink[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [categorizationMode, setCategorizationMode] = useState<CategorizationMode>('subject');
  const [audienceMode, setAudienceMode] = useState<AudienceMode>('all');
  const [fictionMode, setFictionMode] = useState<FictionMode>('all');
  const [mediaMode, setMediaMode] = useState<MediaMode>('all');
  const [collectionMode, setCollectionMode] = useState<CollectionMode>('all');

  const [isCatalogLoading, setIsCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [isManageCatalogsOpen, setIsManageCatalogsOpen] = useState(false);
  const [isCatalogDropdownOpen, setIsCatalogDropdownOpen] = useState(false);

  const [duplicateBook, setDuplicateBook] = useState<BookRecord | null>(null);
  const [existingBook, setExistingBook] = useState<BookRecord | null>(null);
  const [bookToDelete, setBookToDelete] = useState<BookMetadata | null>(null);
  const [sortOrder, setSortOrder] = useLocalStorage<string>('ebook-sort-order', 'added-desc');
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [isAudienceDropdownOpen, setIsAudienceDropdownOpen] = useState(false);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);


  const dropdownRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const settingsMenuRef = useRef<HTMLDivElement>(null);


  const fetchBooks = useCallback(async () => {
    setIsCatalogLoading(false);
    setIsLoading(true);
    try {
      const result = await bookRepository.findAllMetadata();
      
      if (result.success) {
        setBooks(result.data);
      } else {
        // result.success is false, so result.error exists
        logger.error('Failed to fetch books from repository:', (result as { success: false; error: string }).error);
        setBooks([]);
      }
    } catch (error) {
      logger.error('Failed to fetch books:', error);
      setBooks([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Use custom hook for sorting books
  const sortedBooks = useSortedBooks(books, sortOrder as any);

  // Catalog management - wrapped to add side effects
  const handleAddCatalog = useCallback((name: string, url: string, opdsVersion: 'auto' | '1' | '2' = 'auto') => {
    handleAddCatalogHook(name, url, opdsVersion);
  }, [handleAddCatalogHook]);

  const handleDeleteCatalog = useCallback((id: string) => {
    handleDeleteCatalogHook(id);
    if (activeOpdsSource?.id === id) {
      handleSelectSource('library');
    }
  }, [handleDeleteCatalogHook, activeOpdsSource]);

  const handleUpdateCatalog = useCallback((id: string, newName: string) => {
    handleUpdateCatalogHook(id, { name: newName });
    if (activeOpdsSource?.id === id) {
      setActiveOpdsSource(prev => prev ? { ...prev, name: newName } : null);
      setCatalogNavPath(prev => {
        if (prev.length > 0) {
          const newPath = [...prev];
          newPath[0] = { ...newPath[0], name: newName };
          return newPath;
        }
        return prev;
      });
    }
  }, [handleUpdateCatalogHook, activeOpdsSource, setActiveOpdsSource, setCatalogNavPath]);

  const handleAddRegistry = useCallback((name: string, url: string) => {
    handleAddRegistryHook(name, url);
  }, [handleAddRegistryHook]);

  const handleDeleteRegistry = useCallback((id: string) => {
    handleDeleteRegistryHook(id);
    if (activeOpdsSource?.id === id) {
      handleSelectSource('library');
    }
  }, [handleDeleteRegistryHook, activeOpdsSource]);

  const handleUpdateRegistry = useCallback((id: string, newName: string) => {
    handleUpdateRegistryHook(id, { name: newName });
    if (activeOpdsSource?.id === id) {
      setActiveOpdsSource(prev => prev ? { ...prev, name: newName } : null);
    }
  }, [handleUpdateRegistryHook, activeOpdsSource, setActiveOpdsSource]);

  const fetchAndParseSource = useCallback(async (url: string, baseUrl?: string) => {
    setIsLoading(false);
    setIsCatalogLoading(true);
    setCatalogError(null);
    setCatalogBooks([]);
    setOriginalCatalogBooks([]);
    setCatalogNavLinks([]);
    setCatalogPagination(null);

    // If the activeOpdsSource includes an opdsVersion preference, pass it through
    // Force Palace hosts to use OPDS 1 to get collection navigation links
    const hostname = (() => { try { return new URL(url).hostname.toLowerCase(); } catch { return ''; } })();
    const isPalaceHost = hostname.endsWith('palace.io') || hostname.endsWith('palaceproject.io') || hostname === 'palace.io' || hostname.endsWith('.palace.io');

    const forcedVersion = isPalaceHost ? '1' : ((activeOpdsSource && 'opdsVersion' in activeOpdsSource) ? (activeOpdsSource as any).opdsVersion || 'auto' : 'auto');
    const { books, navLinks, pagination, error } = await fetchCatalogContent(url, baseUrl || url, forcedVersion as any);

    if (error) {
      setCatalogError(error);
    } else {
      // A registry is a feed that has navigation but no publications.
      // For these feeds, filter out any nav links that are also for pagination
      // to prevent UI loops and redundant controls.
      const isFeedARegistry = navLinks.length > 0 && books.length === 0;

      let finalNavLinks = navLinks;
      if (isFeedARegistry) {
        const paginationUrls = Object.values(pagination).filter((val): val is string => !!val);
        finalNavLinks = navLinks.filter(nav => !paginationUrls.includes(nav.url));
      }

      // Store raw fetched data for processing by the useEffect
      setOriginalCatalogBooks(books); // Store unfiltered books for availability checks
      setCatalogNavLinks(finalNavLinks);
      setCatalogPagination(pagination);

      // Palace OPDS Collection Architecture:
      // - Root level: Capture all collections from books AND navigation links
      // - Inside collection: DON'T capture collections (we're in a curated set)
      // - Inside category: May capture collections if this is structural navigation
      if (books.length > 0 && catalogNavPath.length <= 1) {
        // Only capture collections when at the catalog root level
        const rootCollections = new Set<string>();

        // From book metadata (publication-level collections)
        books.forEach(book => {
          if (book.collections && book.collections.length > 0) {
            book.collections.forEach(collection => {
              rootCollections.add(collection.title);
            });
          }
        });

        // From navigation links (catalog-level collections)
        finalNavLinks.forEach(link => {
          if (link.rel === 'collection' || link.rel === 'subsection') {
            rootCollections.add(link.title);
          }
        });

        setRootLevelCollections(Array.from(rootCollections));
      }
    }
    setIsCatalogLoading(false);
  }, [fetchCatalogContent, catalogNavPath]);

  // Separate useEffect for re-processing existing data when filters change
  useEffect(() => {
    if (!originalCatalogBooks.length || !catalogNavLinks) return;

    const books = originalCatalogBooks;
    const finalNavLinks = catalogNavLinks;


    // Check for category-based organization first (preferred)
    const hasCategories = books.some(book => book.categories && book.categories.length > 0);
    const hasSubjects = books.some(book => book.subjects && book.subjects.length > 0);
    const hasCollections = books.some(book => book.collections && book.collections.length > 0);

  // Apply filtering chain: fiction -> media
  const fictionFilteredBooks = filterBooksByFiction(books, fictionMode);
  const finalFilteredBooks = filterBooksByMedia(fictionFilteredBooks, mediaMode);

    // Use the selected categorization mode
    if (categorizationMode === 'flat') {
      // Force flat view - no categorization
      setCatalogCollections([]);
      setCategoryLanes([]);
      setCollectionLinks([]);
      setUncategorizedBooks([]);
      setShowCollectionView(false);
      setShowCategoryView(false);
      setCatalogBooks(finalFilteredBooks); // Set the filtered books for flat view
    } else if (categorizationMode === 'subject' && hasSubjects) {
      // Use subjects-based categorization
  const { categoryLanes: lanes, collectionLinks: collLinks, uncategorizedBooks: uncategorized } = groupBooksByMode(finalFilteredBooks, finalNavLinks, catalogPagination || {}, categorizationMode, undefined, fictionMode, mediaMode, collectionMode);
      setCategoryLanes(lanes);
      setCollectionLinks(collLinks);
      setUncategorizedBooks(uncategorized);
      setShowCategoryView(true);
      setShowCollectionView(false);
    } else {
      // No viable categorization - show flat view
      setCatalogCollections([]);
      setCategoryLanes([]);
      setCollectionLinks([]);
      setUncategorizedBooks([]);
      setShowCollectionView(false);
      setShowCategoryView(false);
      setCatalogBooks(finalFilteredBooks); // Set the filtered books for flat view
    }

    // Set catalogBooks for all non-flat modes (flat mode sets it directly)
    if (categorizationMode !== 'flat') {
      setCatalogBooks(finalFilteredBooks);
    }
  }, [originalCatalogBooks, catalogNavLinks, catalogPagination, categorizationMode, audienceMode, fictionMode, mediaMode, collectionMode]);

  // DEBUG: Monitor categoryLanes data
  const handleSelectSource = useCallback((source: 'library' | Catalog | CatalogRegistry) => {
    setIsCatalogDropdownOpen(false);
    if (source === 'library') {
      setActiveOpdsSource(null);
      setCatalogNavPath([]);
      // Reset filters when going back to local library
      setCategorizationMode('subject');
      setAudienceMode('all');
      setFictionMode('all');
      setMediaMode('all');
      setCollectionMode('all');
      // Clear collection-related state
      setRootLevelCollections([]);
      setCollectionLinks([]);
      setCatalogCollections([]);
      setShowCollectionView(false);
    } else if (activeOpdsSource?.id !== source.id) {
      // Reset filters when switching to a different catalog source
      setCategorizationMode('subject');
      setAudienceMode('all');
      setFictionMode('all');
      setMediaMode('all');
      setCollectionMode('all');
      // Clear collection-related state from previous catalog
      setRootLevelCollections([]);
      setCollectionLinks([]);
      setCatalogCollections([]);
      setShowCollectionView(false);

      setActiveOpdsSource(source);
      // When a new source is selected, reset the navigation path to its root.
      setCatalogNavPath([{ name: source.name, url: source.url }]);
    }
  }, [activeOpdsSource?.id, setActiveOpdsSource, setCatalogNavPath]);

  // Catalogs and registries are now managed by useCatalogs hook
  // Migration logic moved to the hook itself

  useEffect(() => {
    if (activeOpdsSource) {
      // If a source is active but the path is empty (e.g., on first selection or page load), initialize it.
      if (catalogNavPath.length === 0) {
        setCatalogNavPath([{ name: activeOpdsSource.name, url: activeOpdsSource.url }]);
      } else {
        // Otherwise, fetch content for the current navigation path.
        const currentPath = catalogNavPath[catalogNavPath.length - 1];
        fetchAndParseSource(currentPath.url, activeOpdsSource.url);
      }
    } else {
      // No active source, so show the local library.
      fetchBooks();
    }
  }, [activeOpdsSource, catalogNavPath, fetchAndParseSource, fetchBooks, setCatalogNavPath]);

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
    const isActive = currentPath.length > 0 && currentPath[currentPath.length - 1].url === link.url;

    return (
      <li className="my-1 group/item">
        <div
          className={`flex items-center gap-2 w-full text-left p-2 rounded-md transition-colors pl-[${indentation}rem] ${isActive
              ? 'bg-sky-700/30 border border-sky-500'
              : 'hover:bg-slate-600/60'
            }`}
        >
          <div className="flex items-center justify-center w-6 h-6 flex-shrink-0">
            {renderIcon()}
          </div>
          <button onClick={() => onNavigate(link)} className="flex-grow text-left flex items-center justify-between">
            <span className={`font-semibold transition-colors ${isActive
                ? 'text-sky-400'
                : 'text-slate-100 group-hover/item:text-sky-400'
              }`}>{link.title}</span>
            <ChevronRightIcon className={`w-4 h-4 transition-opacity mr-2 ${isActive
                ? 'text-sky-500 opacity-100'
                : 'text-slate-200 opacity-0 group-hover/item:opacity-100'
              }`} />
          </button>
          <button
            onClick={handleAdd}
            disabled={isAlreadyAdded}
            className="flex-shrink-0 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-bold transition-all disabled:cursor-not-allowed
                    text-slate-50 opacity-0 group-hover/item:opacity-100 focus-within:opacity-100
                    enabled:bg-sky-600 enabled:hover:bg-sky-700
                    disabled:bg-green-700/60 disabled:text-green-200"
          >
            {isAlreadyAdded ? <CheckIcon className="w-4 h-4" /> : <PlusIcon className="w-4 h-4" />}
            <span>{isAlreadyAdded ? 'Added' : 'Add'}</span>
          </button>
        </div>
        {!isCatalogLink && link.isExpanded && link.children && link.children.length > 0 && (
          <ul className="pl-4 border-l border-slate-700 ml-3">
            {link.children.map(child => (
              <OpdsNavigationItem key={child.url} link={child} level={level + 1} onToggle={onToggle} onNavigate={onNavigate} currentPath={currentPath} />
            ))}
          </ul>
        )}
      </li>
    );
  };

  const renderCurrentView = () => {
    if (isCatalogLoading) {
      return <div className="flex justify-center mt-20"><Spinner text="Loading..." /></div>;
    }
    if (catalogError) {
      return (
        <div className="text-center py-20 bg-slate-700 rounded-lg">
          <h2 className="text-2xl font-semibold text-red-500">Error Loading Source</h2>
          <p className="text-slate-100 mt-2 max-w-xl mx-auto">{catalogError}</p>
        </div>
      );
    }

    // OPDS VIEW (CATALOG OR REGISTRY)
    if (activeOpdsSource) {
      return (
        <div>
          {/* Only show category navigation links in main content, not collection links */}
          {catalogNavLinks.filter(link => link.rel !== 'collection').length > 0 && (
            <div className="bg-slate-700/60 rounded-lg p-4 mb-6">
              <h2 className="text-lg font-semibold text-slate-100 mb-2 px-2">Categories</h2>
              <ul>
                {catalogNavLinks.filter(link => link.rel !== 'collection').map(link => (
                  <OpdsNavigationItem key={link.url} link={link} level={0} onToggle={handleToggleNode} onNavigate={handleNavLinkClick} currentPath={catalogNavPath} />
                ))}
              </ul>
            </div>
          )}

          {catalogBooks.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-4">
                {catalogNavLinks.filter(link => link.rel !== 'collection').length > 0 && <h2 className="text-lg font-semibold text-slate-100">Books</h2>}
                <div className="flex gap-2">
                  {/* Show collection navigation when collections exist in any form */}
                  {(catalogCollections.length > 0 || collectionLinks.length > 0) && (
                    <div className="flex gap-2">
                      {catalogCollections.length > 0 && (
                        <button
                          onClick={handleToggleCollectionView}
                          disabled={isTransitioning}
                          className="text-sm text-sky-400 hover:text-sky-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {showCollectionView ? 'Show All Books' : 'Group by Collections'}
                        </button>
                      )}
                      {collectionLinks.length > 0 && showCategoryView && (
                        <span className="text-sm text-slate-100">
                          Collections available below ↓
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>


              {/* Dynamic Content Area with Smooth Transitions */}
              <div className={`transition-all duration-500 ease-in-out ${isTransitioning ? 'opacity-50 scale-95' : 'opacity-100 scale-100'}`}>
                {/* Category-based lanes (preferred) */}
                {showCategoryView && categoryLanes.length > 0 ? (
                  <div className="space-y-6 animate-fadeIn">
                    {categoryLanes.map((categoryLane, laneIndex) => (
                      <CategoryLaneComponent
                        key={`${categoryLane.category.label}-${laneIndex}`}
                        categoryLane={categoryLane}
                        onBookClick={handleCatalogBookClick}
                      />
                    ))}

                    {uncategorizedBooks.length > 0 && (
                      <UncategorizedLane
                        books={uncategorizedBooks}
                        onBookClick={handleCatalogBookClick}
                      />
                    )}
                  </div>
                ) : showCollectionView && catalogCollections.length > 0 ? (
                  <div className="space-y-6 animate-fadeIn">
                    {catalogCollections.map((collectionGroup, groupIndex) => (
                      <CollectionLane
                        key={`${collectionGroup.collection.title}-${groupIndex}`}
                        collection={collectionGroup.collection}
                        books={collectionGroup.books}
                        onBookClick={handleCatalogBookClick}
                        onCollectionClick={handleCollectionClick}
                      />
                    ))}

                    {uncategorizedBooks.length > 0 && (
                      <UncategorizedLane
                        books={uncategorizedBooks}
                        onBookClick={handleCatalogBookClick}
                      />
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 animate-fadeIn">
                    {catalogBooks.map((book, index) => (
                      <div key={`${book.downloadUrl}-${index}`} onClick={() => handleCatalogBookClick(book)} className="cursor-pointer group relative">
                        <div className="aspect-[2/3] bg-slate-700 rounded-lg overflow-hidden shadow-lg transform group-hover:scale-105 transition-transform duration-300">
                          {book.coverImage ? (
                            <img
                              src={book.coverImage}
                              alt={book.title}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              onError={(e) => {
                                const img = e.currentTarget as HTMLImageElement;
                                img.onerror = null as any;
                                img.src = proxiedUrl(book.coverImage as string);
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center p-4 text-center text-slate-100">
                              <span className="font-semibold">{book.title}</span>
                            </div>
                          )}
                        </div>
                        <div className="mt-2 space-y-1">
                          <h3 className="text-sm font-semibold text-slate-50 truncate group-hover:text-sky-400">{book.title}</h3>
                          <p className="text-xs text-slate-100 truncate">{book.author}</p>
                          <div className="flex gap-1 flex-wrap">
                            {book.alternativeFormats && book.alternativeFormats.length > 0 ? (
                              book.alternativeFormats.map((fmt: any, idx: number) => (
                                <span 
                                  key={`${book.title}-${fmt.format}-${idx}`}
                                  className={`inline-block text-slate-50 text-[10px] font-bold px-2 py-0.5 rounded ${
                                    fmt.format.toUpperCase() === 'PDF' ? 'bg-red-600' : 
                                    fmt.format.toUpperCase() === 'AUDIOBOOK' ? 'bg-purple-700' : 
                                    'bg-sky-600'
                                  }`}
                                  title={`Format: ${fmt.format}, MediaType: ${fmt.mediaType}`}
                                >
                                  {fmt.format}
                                </span>
                              ))
                            ) : book.format && (
                              <span className={`inline-block text-white text-[10px] font-bold px-2 py-0.5 rounded ${
                                book.format.toUpperCase() === 'PDF' ? 'bg-red-600' :
                                book.format.toUpperCase() === 'AUDIOBOOK' ? 'bg-purple-600' :
                                'bg-sky-500'
                              }`}>
                                {book.format}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {catalogNavLinks.length === 0 && catalogBooks.length === 0 && (
            <div className="text-center py-20 bg-slate-700 rounded-lg">
              <h2 className="text-2xl font-semibold text-slate-50">Empty Section</h2>
              <p className="text-slate-100 mt-2">No categories or books were found here.</p>
            </div>
          )}

          {catalogPagination && (catalogPagination.prev || catalogPagination.next) && !isCatalogLoading && (
            <div className="flex justify-between items-center mt-8">
              <button
                onClick={() => catalogPagination.prev && handlePaginationClick(catalogPagination.prev)}
                disabled={!catalogPagination.prev}
                className="bg-slate-700 hover:bg-slate-600 text-slate-50 font-bold py-2 px-4 rounded-lg inline-flex items-center transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <LeftArrowIcon className="w-5 h-5 mr-2" />
                <span>Previous</span>
              </button>
              <button
                onClick={() => catalogPagination.next && handlePaginationClick(catalogPagination.next)}
                disabled={!catalogPagination.next}
                className="bg-slate-700 hover:bg-slate-600 text-slate-50 font-bold py-2 px-4 rounded-lg inline-flex items-center transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span>Next</span>
                <RightArrowIcon className="w-5 h-5 ml-2" />
              </button>
            </div>
          )}
        </div>
      );
    }

    // LIBRARY VIEW
    return (
      <>
        {isLoading ? (
          <div className="flex justify-center mt-20"><Spinner /></div>
        ) : books.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {sortedBooks.map((book) => (
              <div key={book.id} onClick={() => book.id && handleLocalBookClick(book)} className="cursor-pointer group relative">
                <div className="aspect-[2/3] bg-slate-700 rounded-lg overflow-hidden shadow-lg transform group-hover:scale-105 transition-transform duration-300 book-cover-container">
                  {book.coverImage ? (
                    <img src={book.coverImage} alt={book.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center p-4 text-center text-slate-100">
                      <span className="font-semibold">{book.title}</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setBookToDelete(book);
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-slate-900/80 rounded-full text-slate-100 hover:text-slate-50 hover:bg-red-600 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 z-10"
                  aria-label={`Delete ${book.title}`}
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
                <div className="mt-2 space-y-1">
                  <h3 className="text-sm font-semibold text-slate-50 truncate group-hover:text-sky-400">{book.title}</h3>
                  <p className="text-xs text-slate-100 truncate">{book.author}</p>
                  <div className="flex gap-1 flex-wrap">
                    {(book as any).alternativeFormats && (book as any).alternativeFormats.length > 0 ? (
                      (book as any).alternativeFormats.map((fmt: any, idx: number) => (
                        <span 
                          key={`${book.title}-${fmt.format}-${idx}`}
                          className={`inline-block text-slate-50 text-[10px] font-bold px-2 py-0.5 rounded ${
                            fmt.format.toUpperCase() === 'PDF' ? 'bg-red-600' : 
                            fmt.format.toUpperCase() === 'AUDIOBOOK' ? 'bg-purple-700' : 
                            'bg-sky-600'
                          }`}
                          title={`Format: ${fmt.format}, MediaType: ${fmt.mediaType}`}
                        >
                          {fmt.format}
                        </span>
                      ))
                    ) : (
                      <span className={`inline-block text-white text-[10px] font-bold px-2 py-0.5 rounded ${
                        (book.format || 'EPUB').toUpperCase() === 'PDF' ? 'bg-red-600' :
                        (book.format || 'EPUB').toUpperCase() === 'AUDIOBOOK' ? 'bg-purple-600' :
                        'bg-sky-500'
                      }`}>
                        {book.format || 'EPUB'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-slate-800 rounded-lg">
            <h2 className="text-2xl font-semibold text-white">Your library is empty.</h2>
            <p className="text-slate-400 mt-2">Import your first book or add a catalog to get started!</p>
          </div>
        )}
      </>
    );
  };

  // Sort options imported from SORT_OPTIONS constant in hooks

  // Check available data for categorization options (using original unfiltered books)
  // Use useMemo to ensure this only runs when originalCatalogBooks changes
  const { hasAvailableCategories, hasAvailableSubjects, hasAvailableCollections, availableAudiences, availableFictionModes, availableMediaModes, availableCollections, availableGenreCategories } = useMemo(() => {
    const hasCategories = originalCatalogBooks.some(book => book.categories && book.categories.length > 0);
    const hasSubjects = originalCatalogBooks.some(book => book.subjects && book.subjects.length > 0);

    const audiences = getAvailableAudiences(originalCatalogBooks);
    const fictionModes = getAvailableFictionModes(originalCatalogBooks);
    const mediaModes = getAvailableMediaModes(originalCatalogBooks);
    // Palace OPDS Architecture:
    // - At root: Collections available via navigation links AND book metadata
    // - Inside collection: No collection nav links (we're IN a collection), use preserved root collections
    // - Inside category: May have collection nav links for sub-categories
    const isInsideCollection = catalogNavPath.length > 1;
    const collections = isInsideCollection && rootLevelCollections.length > 0
      ? rootLevelCollections  // Always use preserved root collections when navigating deeper
      : getAvailableCollections(originalCatalogBooks, catalogNavLinks); // Use current feed's collections at root
    const genreCategories = getAvailableCategories(originalCatalogBooks, catalogNavLinks);

    // Check if collections are available either from books or navigation links
    const hasCollections = collections.length > 0;

    return {
      hasAvailableCategories: hasCategories,
      hasAvailableSubjects: hasSubjects,
      hasAvailableCollections: hasCollections,
      availableAudiences: audiences,
      availableFictionModes: fictionModes,
      availableMediaModes: mediaModes,
      availableCollections: collections,
      availableGenreCategories: genreCategories,
    };
  }, [originalCatalogBooks, catalogNavLinks, rootLevelCollections]);

  const audienceOptions = [
    { key: 'all' as AudienceMode, label: 'All Ages', available: true },
    { key: 'adult' as AudienceMode, label: 'Adult', available: availableAudiences.includes('adult') },
    { key: 'young-adult' as AudienceMode, label: 'Young Adult', available: availableAudiences.includes('young-adult') },
    { key: 'children' as AudienceMode, label: 'Children', available: availableAudiences.includes('children') },
  ];

  const fictionOptions = [
    { key: 'all' as FictionMode, label: 'All Types', available: true },
    { key: 'fiction' as FictionMode, label: 'Fiction', available: availableFictionModes.includes('fiction') },
    { key: 'non-fiction' as FictionMode, label: 'Non-Fiction', available: availableFictionModes.includes('non-fiction') },
  ];

  const mediaOptions = [
    { key: 'all' as MediaMode, label: 'All Media', available: true },
    { key: 'ebook' as MediaMode, label: 'E-Books', available: availableMediaModes.includes('ebook') },
    { key: 'audiobook' as MediaMode, label: 'Audiobooks', available: availableMediaModes.includes('audiobook') },
  ];

  const handleCategorizationChange = (mode: CategorizationMode) => {
    setCategorizationMode(mode);

    // If we have an active OPDS source, re-fetch to apply the new categorization
    if (activeOpdsSource && catalogNavPath.length > 0) {
      const currentPath = catalogNavPath[catalogNavPath.length - 1];
      fetchAndParseSource(currentPath.url, activeOpdsSource.url);
    }
  };

  const handleAudienceChange = (mode: AudienceMode) => {
    setAudienceMode(mode);

    // Audience filtering is client-side only, no need to re-fetch
    // The useMemo will automatically re-run when audienceMode changes
  };

  const handleFictionChange = (mode: FictionMode) => {
    setFictionMode(mode);

    // Fiction filtering is client-side only, no need to re-fetch
    // The useMemo will automatically re-run when fictionMode changes
  };

  const handleMediaChange = (mode: MediaMode) => {
    setMediaMode(mode);

    // Media filtering is client-side only, no need to re-fetch
    // The useMemo will automatically re-run when mediaMode changes
  };

  const handleCollectionChange = (mode: CollectionMode) => {
    if (mode === 'all') {
      setCollectionMode(mode);
      // If we're deep in navigation, go back to root when selecting "All Books"
      if (catalogNavPath.length > 1 && activeOpdsSource) {
        setCatalogNavPath([{ name: activeOpdsSource.name, url: activeOpdsSource.url }]);
        fetchAndParseSource(activeOpdsSource.url, activeOpdsSource.url);
      }
      return;
    }

    // Check if this collection corresponds to a navigation link
    const collectionNavLink = catalogNavLinks.find(link =>
      (link.rel === 'collection' || link.rel === 'subsection') && link.title === mode,
    );

    if (collectionNavLink) {
      // Navigate to the collection's feed and update collection mode for sidebar sync
      if (activeOpdsSource) {
        const newPath = [...catalogNavPath, { name: collectionNavLink.title, url: collectionNavLink.url }];
        setCatalogNavPath(newPath);
        setCollectionMode(mode); // Update collection mode to sync sidebar state
        fetchAndParseSource(collectionNavLink.url, activeOpdsSource.url);
      }
    } else {
      // It's a book-level collection, just filter
      setCollectionMode(mode);
    }
  };

  const currentTitle = activeOpdsSource ? activeOpdsSource.name : 'My Library';
  const isBrowsingOpds = !!activeOpdsSource;

  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
        <div className="flex items-center gap-4">
          <img src={mebooksBook} alt="MeBooks Logo" className="w-10 h-10 flex-shrink-0" />
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setIsCatalogDropdownOpen(prev => !prev)}
              className="flex items-center gap-2 text-white text-left"
            >
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                {currentTitle}
              </h1>
              <ChevronDownIcon className={`w-6 h-6 transition-transform flex-shrink-0 mt-1 md:mt-2 ${isCatalogDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {isCatalogDropdownOpen && (
              <div className="absolute top-full mt-2 w-72 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20">
                <ul className="p-1 text-white max-h-96 overflow-y-auto">
                  <li>
                    <button onClick={() => handleSelectSource('library')} className={`w-full text-left px-3 py-2 text-sm rounded-md ${!isBrowsingOpds ? 'bg-sky-600' : 'hover:bg-slate-700'}`}>
                      My Library
                    </button>
                  </li>
                  {(catalogs.length > 0 || registries.length > 0) && <li className="my-1 border-t border-slate-700" />}

                  {catalogs.length > 0 && <>
                    <li className="px-3 pt-2 pb-1 text-xs font-semibold text-slate-400 uppercase">Catalogs</li>
                    {catalogs.map(catalog => (
                      <li key={catalog.id}>
                        <button onClick={() => handleSelectSource(catalog)} className={`w-full text-left px-3 py-2 text-sm rounded-md truncate ${isBrowsingOpds && activeOpdsSource?.id === catalog.id ? 'bg-sky-600' : 'hover:bg-slate-700'}`}>
                          {catalog.name}
                        </button>
                      </li>
                    ))}
                  </>}
                  {registries.length > 0 && <>
                    <li className="px-3 pt-2 pb-1 text-xs font-semibold text-slate-400 uppercase">Registries</li>
                    {registries.map(registry => (
                      <li key={registry.id}>
                        <button onClick={() => handleSelectSource(registry)} className={`w-full text-left px-3 py-2 text-sm rounded-md truncate ${isBrowsingOpds && activeOpdsSource?.id === registry.id ? 'bg-sky-600' : 'hover:bg-slate-700'}`}>
                          {registry.name}
                        </button>
                      </li>
                    ))}
                  </>}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 self-end md:self-auto">
          {!isBrowsingOpds && (
            <div ref={sortDropdownRef} className="relative">
              <button onClick={() => setIsSortDropdownOpen(prev => !prev)} className="cursor-pointer bg-slate-700 hover:bg-slate-600 text-white font-bold p-2 sm:py-2 sm:px-4 rounded-lg inline-flex items-center transition-colors duration-200">
                <AdjustmentsVerticalIcon className="w-5 h-5 sm:mr-2" />
                <span className="hidden sm:inline">Sort</span>
              </button>
              {isSortDropdownOpen && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20">
                  <ul className="p-1 text-white">
                    {SORT_OPTIONS.map(option => (
                      <li key={option.key}>
                        <button onClick={() => handleSortChange(option.key)} className={`w-full text-left px-3 py-2 text-sm rounded-md ${sortOrder === option.key ? 'bg-sky-600' : 'hover:bg-slate-700'}`}>
                          {option.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Categorization Mode Toggle - Only show for OPDS catalogs */}
          {isBrowsingOpds && hasAvailableSubjects && (
            <div className="flex items-center space-x-3">
              <span className="text-sm text-slate-300 font-medium">View:</span>
              <button
                onClick={() => setCategorizationMode(categorizationMode === 'subject' ? 'flat' : 'subject')}
                aria-label={`Switch to ${categorizationMode === 'subject' ? 'flat view' : 'category view'}`}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-800 ${categorizationMode === 'subject' ? 'bg-emerald-600' : 'bg-slate-600'
                  }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${categorizationMode === 'subject' ? 'translate-x-6' : 'translate-x-1'
                    }`}
                />
              </button>
              <span className="text-sm text-slate-300">
                {categorizationMode === 'subject' ? 'By Category' : 'All Books (Flat)'}
              </span>
            </div>
          )}

          <label htmlFor="epub-upload" className={`cursor-pointer bg-sky-500 hover:bg-sky-600 text-white font-bold p-2 sm:py-2 sm:px-4 rounded-lg inline-flex items-center transition-colors duration-200 ${importStatus.isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <UploadIcon className="w-5 h-5 sm:mr-2" />
            <span className="hidden sm:inline">Import Book</span>
          </label>
          <input id="epub-upload" type="file" accept=".epub,.pdf" className="hidden" onChange={handleFileChange} disabled={importStatus.isLoading} />

          <div ref={settingsMenuRef} className="relative">
            <button
              onClick={() => setIsSettingsMenuOpen(prev => !prev)}
              className="cursor-pointer bg-slate-700 hover:bg-slate-600 text-white font-bold p-2 rounded-lg inline-flex items-center transition-colors duration-200 h-[40px] w-[40px] justify-center"
              aria-label="Open settings menu"
              aria-haspopup="true"
              {...(isSettingsMenuOpen ? { 'aria-expanded': 'true' } : {})}
            >
              <SettingsIcon className="w-5 h-5" />
            </button>
            {isSettingsMenuOpen && (
              <div
                className="absolute top-full right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20"
                role="menu"
                aria-orientation="vertical"
              >
                <ul className="p-1 text-white" role="none">
                  <li role="none">
                    <button
                      onClick={() => {
                        setIsManageCatalogsOpen(true);
                        setIsSettingsMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-slate-700 block"
                      role="menuitem"
                    >
                      Manage Sources
                    </button>
                  </li>
                  <li className="my-1 border-t border-slate-700/50" role="separator" />
                  <li role="none">
                    <button
                      onClick={() => {
                        onOpenLocalStorageModal();
                        setIsSettingsMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-slate-700 block"
                      role="menuitem"
                    >
                      Local Storage
                    </button>
                  </li>
                  <li role="none">
                    <button
                      onClick={() => {
                        onOpenCloudSyncModal();
                        setIsSettingsMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-slate-700 block"
                      role="menuitem"
                    >
                      Cloud Storage (Google Drive)
                    </button>
                  </li>
                  <li className="my-1 border-t border-slate-700/50" role="separator" />
                  <li role="none">
                    <button
                      onClick={() => {
                        onShowAbout();
                        setIsSettingsMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-slate-700 block"
                      role="menuitem"
                    >
                      About
                    </button>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </header>

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

      {/* Category Navigation - for genre-based filtering when browsing OPDS */}
      {isBrowsingOpds && (availableGenreCategories.length > 0 || availableAudiences.length > 1 || availableFictionModes.length > 1) && (
        <div className="bg-slate-800/50 rounded-lg p-4 mb-6">
          {availableGenreCategories.length > 0 && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-slate-300 mb-3">Browse by Category</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {/* Navigate to all books */ }}
                  className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-md text-sm transition-colors"
                >
                  All Books
                </button>
                {availableGenreCategories.map(category => (
                  <button
                    key={category}
                    onClick={() => {
                      // Navigate to category-specific feed
                      const categoryNavLink = catalogNavLinks.find(link =>
                        (link.rel === 'collection' || link.rel === 'subsection') &&
                        link.title === category &&
                        link.url.includes('/groups/'),
                      );

                      if (categoryNavLink && activeOpdsSource) {
                        setCatalogNavPath(prev => [...prev, { name: categoryNavLink.title, url: categoryNavLink.url }]);
                        fetchAndParseSource(categoryNavLink.url, activeOpdsSource.url);
                      }
                    }}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-sm transition-colors"
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Filters Row */}
          <div className="flex flex-wrap gap-4 items-center">
            {/* Audience Filter */}
            {availableAudiences.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">Audience:</span>
                <div className="flex gap-1">
                  {audienceOptions.filter(option => option.available).map(option => (
                    <button
                      key={option.key}
                      onClick={() => handleAudienceChange(option.key)}
                      className={`px-3 py-1 text-sm rounded-md transition-colors ${audienceMode === option.key
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                        }`}
                    >
                      {option.label.replace('All Ages', 'All')}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Fiction Filter */}
            {availableFictionModes.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">Type:</span>
                <div className="flex gap-1">
                  {fictionOptions.filter(option => option.available).map(option => (
                    <button
                      key={option.key}
                      onClick={() => handleFictionChange(option.key)}
                      className={`px-3 py-1 text-sm rounded-md transition-colors ${fictionMode === option.key
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                        }`}
                    >
                      {option.label.replace('All Types', 'All')}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Format Filter */}
            {isBrowsingOpds && availableMediaModes.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">Format:</span>
                <div className="flex gap-1">
                  {mediaOptions.filter(option => option.available).map(option => (
                    <button
                      key={option.key}
                      onClick={() => handleMediaChange(option.key)}
                      className={`px-3 py-1 text-sm rounded-md transition-colors ${mediaMode === option.key
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                        }`}
                    >
                      {option.label.replace('All Media', 'All')}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {(importStatus.isLoading || importStatus.error || importStatus.message === 'Import successful!') && (
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
          {/* Collections Sidebar - Show based on Palace OPDS structure:
              - At root: Show if current feed has collections
              - Inside collection/category: Show preserved root collections for navigation back
              - During loading: Keep visible if we had collections before */}
          {(availableCollections.length > 0 || (catalogNavPath.length > 1 && rootLevelCollections.length > 0) || (isCatalogLoading && rootLevelCollections.length > 0) || audienceLinks.length > 0) && (
            <aside className="w-full lg:w-64 lg:flex-shrink-0 order-2 lg:order-1">
              <div className="bg-slate-800/50 rounded-lg p-4 lg:sticky lg:top-4">
                <h3 className="text-lg font-semibold text-white mb-4">Navigation By</h3>
                {/* Collections Accordion */}
                <div className="mt-4">
                  <div className="sidebar-accordion-header">Collections</div>
                  <nav className="space-y-2">
                    <button
                      onClick={() => handleCollectionChange('all')}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                        (catalogNavPath.length <= 1 && (collectionMode === 'all' || !collectionMode))
                          ? 'bg-emerald-600 text-white font-medium shadow-lg border-2 border-emerald-500'
                          : 'bg-slate-700 hover:bg-slate-600 text-slate-300 border-2 border-transparent'
                        }`}
                    >
                      All Books
                    </button>
                    {(availableCollections.length > 0 ? availableCollections : rootLevelCollections).map((collection, index) => {
                      const isActiveByPath = catalogNavPath.length > 1 && catalogNavPath[catalogNavPath.length - 1].name === collection;
                      const isActiveByMode = catalogNavPath.length <= 1 && collectionMode === collection;
                      const isActive = isActiveByPath || isActiveByMode;

                      return (
                        <button
                          key={`${collection}-${index}`}
                          onClick={() => handleCollectionChange(collection as CollectionMode)}
                          className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 border-2 ${isActive
                              ? 'bg-sky-600 text-white font-medium shadow-lg border-sky-500'
                              : 'bg-sky-600/20 hover:bg-sky-600/40 text-sky-300 border-transparent hover:border-sky-600/30'
                            }`}
                        >
                          <span className={isActive ? '📁' : '📂'}>
                            {isActive ? '📁' : '📂'}
                          </span>
                          {collection}
                        </button>
                      );
                    })}
                  </nav>
                </div>
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
