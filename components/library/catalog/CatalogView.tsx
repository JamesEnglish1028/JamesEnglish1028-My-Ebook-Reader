import React, { useEffect, useMemo, useState } from 'react';

import { useCatalogContent } from '../../../hooks';
import { filterBooksByAudience, filterBooksByFiction, filterBooksByMedia, getAvailableAudiences, getAvailableCategories, getAvailableCollections, getAvailableFictionModes, getAvailableMediaModes, groupBooksByMode } from '../../../services/opds';
import type { AudienceMode, Catalog, CatalogBook, CatalogNavigationLink, CatalogRegistry, CategorizationMode, CategoryLane, CollectionGroup, CollectionMode, FictionMode, MediaMode } from '../../../types';
import { CategoryLaneComponent } from '../../CategoryLane';
import { Error as ErrorDisplay, Loading } from '../../shared';
import { UncategorizedLane } from '../../UncategorizedLane';
import { CatalogFilters, CatalogNavigation, CatalogSidebar } from '../catalog';
import { BookGrid, EmptyState } from '../shared';

interface CatalogViewProps {
  /** Active OPDS source (catalog or registry) */
  activeOpdsSource: Catalog | CatalogRegistry;
  /** Current navigation path */
  catalogNavPath: { name: string; url: string }[];
  /** Callback to update navigation path */
  setCatalogNavPath: React.Dispatch<React.SetStateAction<{ name: string; url: string }[]>>;
  /** Callback when catalog book is clicked */
  onShowBookDetail: (book: CatalogBook, source: 'catalog', catalogName?: string) => void;
  /** Root level collections (for sidebar persistence) */
  rootLevelCollections: string[];
  /** Callback to update root collections */
  setRootLevelCollections: React.Dispatch<React.SetStateAction<string[]>>;
}

/**
 * CatalogView - Container for OPDS catalog browsing
 *
 * Handles fetching and displaying OPDS catalog content with navigation,
 * filtering, and multiple display modes (lanes, collections, flat grid).
 */
const CatalogView: React.FC<CatalogViewProps> = ({
  activeOpdsSource,
  catalogNavPath,
  setCatalogNavPath,
  onShowBookDetail,
  rootLevelCollections,
  setRootLevelCollections,
}) => {
  // Filter states
  const [audienceMode, setAudienceMode] = useState<AudienceMode>('all');
  const [fictionMode, setFictionMode] = useState<FictionMode>('all');
  const [mediaMode, setMediaMode] = useState<MediaMode>('all');
  const [collectionMode, setCollectionMode] = useState<CollectionMode>('all');

  // View states
  const [categorizationMode, setCategorizationMode] = useState<CategorizationMode>('subject');
  const [showCategoryView, setShowCategoryView] = useState(false);
  const [showCollectionView, setShowCollectionView] = useState(false);
  const [categoryLanes, setCategoryLanes] = useState<CategoryLane[]>([]);
  const [catalogCollections, setCatalogCollections] = useState<CollectionGroup[]>([]);
  const [uncategorizedBooks, setUncategorizedBooks] = useState<CatalogBook[]>([]);
  const [catalogBooks, setCatalogBooks] = useState<CatalogBook[]>([]);

  // Get current URL from navigation path
  const currentUrl = catalogNavPath.length > 0
    ? catalogNavPath[catalogNavPath.length - 1].url
    : activeOpdsSource?.url || null;

  // Get OPDS version preference
  const opdsVersion = (activeOpdsSource && 'opdsVersion' in activeOpdsSource)
    ? (activeOpdsSource as any).opdsVersion || 'auto'
    : 'auto';

  // Clear local display state when switching sources or navigation URL so stale
  // books/caches don't remain visible while the new feed loads.
  useEffect(() => {
    setCatalogBooks([]);
    setCategoryLanes([]);
    setUncategorizedBooks([]);
    setCatalogCollections([]);
    setShowCategoryView(false);
  }, [currentUrl, activeOpdsSource?.id]);

  // Fetch catalog content using React Query
  const {
    data: catalogData,
    isLoading,
    error,
    refetch,
  } = useCatalogContent(
    currentUrl,
    activeOpdsSource?.url || '',
    opdsVersion,
    !!activeOpdsSource, // Only fetch if source is active
  );

  // Extract data from query result
  const originalCatalogBooks = catalogData?.books || [];
  const catalogNavLinks = catalogData?.navLinks || [];
  const catalogPagination = catalogData?.pagination || null;

  // Update root collections when catalog data changes
  useEffect(() => {
    if (originalCatalogBooks.length > 0 && catalogNavPath.length <= 1) {
      const rootCollections = new Set<string>();

      originalCatalogBooks.forEach(book => {
        if (book.collections && book.collections.length > 0) {
          book.collections.forEach(collection => {
            rootCollections.add(collection.title);
          });
        }
      });

      catalogNavLinks.forEach(link => {
        if (link.rel === 'collection' || link.rel === 'subsection') {
          rootCollections.add(link.title);
        }
      });

      setRootLevelCollections(Array.from(rootCollections));
    }
  }, [originalCatalogBooks, catalogNavLinks, catalogNavPath.length, setRootLevelCollections]);

  // Calculate available filters
  const { availableAudiences, availableFictionModes, availableMediaModes, availableCollections, availableGenreCategories } = useMemo(() => {
    return {
      availableAudiences: getAvailableAudiences(originalCatalogBooks),
      availableFictionModes: getAvailableFictionModes(originalCatalogBooks),
      availableMediaModes: getAvailableMediaModes(originalCatalogBooks),
      availableCollections: getAvailableCollections(originalCatalogBooks, catalogNavLinks),
      availableGenreCategories: getAvailableCategories(originalCatalogBooks, catalogNavLinks),
    };
  }, [originalCatalogBooks, catalogNavLinks]);

  // Apply filters to books
  useEffect(() => {
    if (originalCatalogBooks.length === 0) return;

    // Apply filters sequentially
    const audienceFiltered = filterBooksByAudience(originalCatalogBooks, audienceMode);
    const fictionFiltered = filterBooksByFiction(audienceFiltered, fictionMode);
    const mediaFiltered = filterBooksByMedia(fictionFiltered, mediaMode);

    // Apply collection filter if active, but only at root level
    // When navigated into a collection feed, the URL itself provides the scoping
    let finalFiltered = mediaFiltered;
    if (collectionMode !== 'all' && catalogNavPath.length <= 1) {
      finalFiltered = mediaFiltered.filter(book =>
        book.collections?.some(c => c.title === collectionMode),
      );
    }

    // Apply categorization mode
    if (categorizationMode === 'flat') {
      // Flat view - just show all books in grid
      setCatalogBooks(finalFiltered);
      setCategoryLanes([]);
      setShowCategoryView(false);
    } else if (categorizationMode === 'subject') {
      // Subject-based categorization - group into lanes
      const hasSubjects = availableGenreCategories.length > 0;
      if (hasSubjects) {
        const grouped = groupBooksByMode(
          finalFiltered,
          catalogNavLinks,
          catalogPagination || {},
          categorizationMode,
          audienceMode,
          fictionMode,
          mediaMode,
          collectionMode,
        );
        setCategoryLanes(grouped.categoryLanes);
        setUncategorizedBooks(grouped.uncategorizedBooks);
        setCatalogBooks([]); // Clear flat books when showing categories
        setShowCategoryView(true);
      } else {
        // No subjects available, fall back to flat view
        setCatalogBooks(finalFiltered);
        setCategoryLanes([]);
        setShowCategoryView(false);
      }
    }
  }, [originalCatalogBooks, catalogNavLinks, catalogPagination, audienceMode, fictionMode, mediaMode, collectionMode, categorizationMode, availableGenreCategories.length, catalogNavPath.length]);

  // Handle navigation - React Query will automatically refetch when catalogNavPath changes
  const handleBreadcrumbClick = (index: number) => {
    const newPath = catalogNavPath.slice(0, index + 1);
    setCatalogNavPath(newPath);

    // Reset filters
    setAudienceMode('all');
    setFictionMode('all');
    setMediaMode('all');
    setCollectionMode('all');
  };

  const handlePaginationClick = (url: string) => {
    // Update the current navigation item's URL for pagination
    setCatalogNavPath(prev => {
      if (prev.length === 0) return prev;
      const newPath = [...prev];
      newPath[newPath.length - 1] = { ...newPath[newPath.length - 1], url };
      return newPath;
    });
  };

  const handleCatalogBookClick = (book: CatalogBook) => {
    onShowBookDetail(book, 'catalog', activeOpdsSource.name);
  };

  const handleCategoryNavigate = (categoryNavLink: CatalogNavigationLink) => {
    if (activeOpdsSource) {
      setCatalogNavPath(prev => [...prev, { name: categoryNavLink.title, url: categoryNavLink.url }]);
      // Reset filters when navigating to a new feed
      setAudienceMode('all');
      setFictionMode('all');
      setMediaMode('all');
    }
  };

  const handleCollectionChange = (mode: CollectionMode) => {
    if (mode === 'all') {
      setCollectionMode(mode);
      // If we're deep in navigation, go back to root when selecting "All Books"
      if (catalogNavPath.length > 1 && activeOpdsSource) {
        setCatalogNavPath([{ name: activeOpdsSource.name, url: activeOpdsSource.url }]);
      }
      return;
    }

    // Check if this collection corresponds to a navigation link
    const collectionNavLink = catalogNavLinks.find(link =>
      (link.rel === 'collection' || link.rel === 'subsection') && link.title === mode,
    );

    if (collectionNavLink) {
      // Navigate to the collection's feed - the feed URL itself provides the scoping
      if (activeOpdsSource) {
        const newPath = [...catalogNavPath, { name: collectionNavLink.title, url: collectionNavLink.url }];
        setCatalogNavPath(newPath);
        // Keep collection mode set for sidebar highlighting, but don't filter
        setCollectionMode(mode);
        // Reset filters when navigating to a new feed
        setAudienceMode('all');
        setFictionMode('all');
        setMediaMode('all');
      }
    } else {
      // It's a book-level collection, just filter
      setCollectionMode(mode);
    }
  };

  // Determine which collections to show in sidebar
  const sidebarCollections = availableCollections.length > 0 ? availableCollections : rootLevelCollections;
  const showSidebar =
    sidebarCollections.length > 0 ||
    availableGenreCategories.length > 0 ||
    (catalogNavPath.length > 1 && rootLevelCollections.length > 0) ||
    (isLoading && rootLevelCollections.length > 0);

  if (isLoading) {
    return <Loading variant="spinner" message="Loading catalog..." />;
  }

  if (error) {
    return (
      <ErrorDisplay
        variant="page"
        title="Failed to Load Catalog"
        message={error?.message || 'Could not load catalog content.'}
        onRetry={() => refetch()}
      />
    );
  }

  const hasBooks = catalogBooks.length > 0 || categoryLanes.length > 0 || uncategorizedBooks.length > 0;
  const hasNavLinks = catalogNavLinks.filter(link => link.rel !== 'collection').length > 0;
  const hasOriginalBooks = originalCatalogBooks.length > 0;

  // If there are no books at all (not just filtered out), show full empty state
  if (!hasOriginalBooks && !hasNavLinks && !isLoading) {
    return <EmptyState variant="catalog" />;
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Navigation Sidebar */}
      {showSidebar && (
        <aside className="w-full lg:w-64 lg:flex-shrink-0 order-2 lg:order-1">
          <CatalogSidebar
            collections={sidebarCollections}
            categories={availableGenreCategories}
            activeCollection={collectionMode}
            navPathLength={catalogNavPath.length}
            onCollectionChange={handleCollectionChange}
            onCategoryNavigate={(category) => {
              const categoryNavLink = catalogNavLinks.find(
                (link) =>
                  (link.rel === 'collection' || link.rel === 'subsection') &&
                  link.title === category &&
                  link.url.includes('/groups/'),
              );
              if (categoryNavLink) {
                handleCategoryNavigate(categoryNavLink);
              }
            }}
            catalogNavLinks={catalogNavLinks}
            activeOpdsSource={activeOpdsSource}
            isLoading={isLoading}
          />
        </aside>
      )}

      {/* Main Content */}
      <main className="flex-1 min-w-0 order-1 lg:order-2">
        {/* Breadcrumb Navigation */}
        <CatalogNavigation
          navPath={catalogNavPath}
          pagination={catalogPagination}
          onBreadcrumbClick={handleBreadcrumbClick}
          onPaginationClick={handlePaginationClick}
          isLoading={isLoading}
        />

        {/* Filters */}
        <CatalogFilters
          availableAudiences={availableAudiences}
          availableFictionModes={availableFictionModes}
          availableMediaModes={availableMediaModes}
          audienceMode={audienceMode}
          fictionMode={fictionMode}
          mediaMode={mediaMode}
          onAudienceChange={setAudienceMode}
          onFictionChange={setFictionMode}
          onMediaChange={setMediaMode}
        />

        {/* Categorization Mode Toggle - Only show when subjects are available */}
        {availableGenreCategories.length > 0 && (
          <div className="flex items-center space-x-3 mb-6 px-4">
            <span className="text-sm text-slate-300 font-medium">View By:</span>
            <button
              onClick={() => setCategorizationMode(categorizationMode === 'subject' ? 'flat' : 'subject')}
              aria-label={`Switch to ${categorizationMode === 'subject' ? 'grid view' : 'lanes view'}`}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-800 ${categorizationMode === 'subject' ? 'bg-emerald-600' : 'bg-slate-600'
                }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${categorizationMode === 'subject' ? 'translate-x-6' : 'translate-x-1'
                  }`}
              />
            </button>
            <span className="text-sm text-slate-300">
              {categorizationMode === 'subject' ? 'Lanes' : 'Grid'}
            </span>
          </div>
        )}

        {/* Books Display - Conditional based on categorization mode */}
        {showCategoryView && categoryLanes.length > 0 ? (
          // Category lane view
          <div className="space-y-8">
            {categoryLanes.map((lane) => (
              <CategoryLaneComponent
                key={lane.category.label}
                categoryLane={lane}
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
        ) : hasBooks ? (
          // Flat grid view
          <BookGrid
            books={catalogBooks}
            onBookClick={handleCatalogBookClick}
            isLoading={isLoading}
          />
        ) : hasOriginalBooks ? (
          // No books match current filters
          <div className="text-center py-12">
            <p className="text-slate-400 text-lg mb-2">No books match your current filters</p>
            <p className="text-slate-500 text-sm">Try adjusting your filters or selecting "All" to see more books</p>
          </div>
        ) : null}
      </main>
    </div>
  );
};

export default CatalogView;
