import React, { useState } from 'react';
import type { CatalogNavigationLink, CollectionMode } from '../../../types';

interface CatalogSidebarProps {
  /** Available collections to display */
  collections: string[];
  /** Available categories to display */
  categories: string[];
  /** Currently active collection */
  activeCollection: CollectionMode;
  /** Current navigation path depth */
  navPathLength: number;
  /** Callback when collection is selected */
  onCollectionChange: (collection: CollectionMode) => void;
  /** Callback when category is clicked */
  onCategoryNavigate: (category: string) => void;
  /** Catalog navigation links for finding category URLs */
  catalogNavLinks: CatalogNavigationLink[];
  /** Active OPDS source */
  activeOpdsSource: any;
  /** Whether catalog is currently loading */
  isLoading?: boolean;
}

/**
 * CatalogSidebar - Navigation sidebar with accordions
 *
 * Displays "Navigate By" sections for Categories and Curated Collections.
 * Uses accordions to organize navigation options.
 */
const CatalogSidebar: React.FC<CatalogSidebarProps> = ({
  collections,
  categories,
  activeCollection,
  navPathLength,
  onCollectionChange,
  onCategoryNavigate,
  catalogNavLinks,
  activeOpdsSource,
  isLoading = false,
}) => {
  const [categoriesOpen, setCategoriesOpen] = useState(true);
  const [collectionsOpen, setCollectionsOpen] = useState(true);

  // Don't render if no categories or collections available
  if (categories.length === 0 && collections.length === 0 && !isLoading) {
    return null;
  }

  const handleCategoryClick = (category: string) => {
    // Find the category navigation link
    const categoryNavLink = catalogNavLinks.find(
      (link) =>
        (link.rel === 'collection' || link.rel === 'subsection') &&
        link.title === category &&
        link.url.includes('/groups/')
    );

    if (categoryNavLink && activeOpdsSource) {
      onCategoryNavigate(category);
    }
  };

  return (
    <aside className="w-full lg:w-64 lg:flex-shrink-0 order-2 lg:order-1">
      <div className="bg-slate-800/50 rounded-lg p-4 lg:sticky lg:top-4">
        <h3 className="text-lg font-semibold text-white mb-4">Navigate By</h3>

        {/* "All Books" button - always at top */}
        <button
          onClick={() => onCollectionChange('all')}
          className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors mb-4 ${navPathLength <= 1 && (activeCollection === 'all' || !activeCollection)
              ? 'bg-emerald-600 text-white font-medium shadow-lg border-2 border-emerald-500'
              : 'bg-slate-700 hover:bg-slate-600 text-slate-300 border-2 border-transparent'
            }`}
        >
          All Books
        </button>

        <div className="space-y-3">
          {/* Categories Accordion */}
          {categories.length > 0 && (
            <div className="border border-slate-700 rounded-lg overflow-hidden">
              <button
                onClick={() => setCategoriesOpen(!categoriesOpen)}
                className="w-full flex items-center justify-between px-3 py-2 bg-slate-700/50 hover:bg-slate-700 transition-colors"
              >
                <span className="text-sm font-medium text-slate-200">Categories</span>
                <svg
                  className={`w-4 h-4 text-slate-400 transition-transform ${categoriesOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {categoriesOpen && (
                <nav className="p-2 space-y-1 bg-slate-800/30">
                  {categories.map((category, index) => (
                    <button
                      key={`${category}-${index}`}
                      onClick={() => handleCategoryClick(category)}
                      className="w-full text-left px-3 py-2 rounded-md text-sm transition-colors bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-transparent hover:border-emerald-600/30"
                    >
                      {category}
                    </button>
                  ))}
                </nav>
              )}
            </div>
          )}

          {/* Curated Collections Accordion */}
          {collections.length > 0 && (
            <div className="border border-slate-700 rounded-lg overflow-hidden">
              <button
                onClick={() => setCollectionsOpen(!collectionsOpen)}
                className="w-full flex items-center justify-between px-3 py-2 bg-slate-700/50 hover:bg-slate-700 transition-colors"
              >
                <span className="text-sm font-medium text-slate-200">Curated Collections</span>
                <svg
                  className={`w-4 h-4 text-slate-400 transition-transform ${collectionsOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {collectionsOpen && (
                <nav className="p-2 space-y-1 bg-slate-800/30">
                  {collections.map((collection, index) => {
                    const isActive = activeCollection === collection;
                    return (
                      <button
                        key={`${collection}-${index}`}
                        onClick={() => onCollectionChange(collection as CollectionMode)}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 border ${isActive
                            ? 'bg-sky-600 text-white font-medium shadow-lg border-sky-500'
                            : 'bg-sky-600/20 hover:bg-sky-600/40 text-sky-300 border-transparent hover:border-sky-600/30'
                          }`}
                      >
                        <span>{isActive ? '📁' : '📂'}</span>
                        {collection}
                      </button>
                    );
                  })}
                </nav>
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default CatalogSidebar;
