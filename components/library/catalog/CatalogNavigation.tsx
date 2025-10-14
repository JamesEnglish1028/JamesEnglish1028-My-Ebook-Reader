import React from 'react';
import type { CatalogPagination } from '../../../types';
import { ChevronRightIcon, LeftArrowIcon, RightArrowIcon } from '../../icons';

interface CatalogNavigationProps {
  /** Breadcrumb navigation path */
  navPath: { name: string; url: string }[];
  /** Pagination links */
  pagination: CatalogPagination | null;
  /** Callback for breadcrumb navigation */
  onBreadcrumbClick: (index: number) => void;
  /** Callback for pagination (prev/next) */
  onPaginationClick: (url: string) => void;
  /** Whether catalog is currently loading */
  isLoading?: boolean;
}

/**
 * CatalogNavigation - Displays breadcrumb trail and pagination controls
 * 
 * Shows the navigation path through catalog sections and provides
 * Previous/Next buttons for paginated results.
 */
const CatalogNavigation: React.FC<CatalogNavigationProps> = ({
  navPath,
  pagination,
  onBreadcrumbClick,
  onPaginationClick,
  isLoading = false,
}) => {
  const showBreadcrumbs = navPath.length > 0;
  const showPagination = pagination && (pagination.prev || pagination.next) && !isLoading;

  return (
    <>
      {/* Breadcrumb Navigation */}
      {showBreadcrumbs && (
        <nav aria-label="breadcrumb" className="flex items-center text-sm text-slate-400 mb-4 flex-wrap">
          {navPath.map((item, index) => (
            <React.Fragment key={index}>
              <button
                onClick={() => onBreadcrumbClick(index)}
                className={`hover:text-sky-400 transition-colors ${
                  index === navPath.length - 1
                    ? 'font-semibold text-white'
                    : ''
                }`}
                aria-current={index === navPath.length - 1 ? 'page' : undefined}
              >
                {item.name}
              </button>
              {index < navPath.length - 1 && (
                <ChevronRightIcon className="w-4 h-4 mx-1 flex-shrink-0" />
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      {/* Pagination Controls */}
      {showPagination && (
        <div className="flex justify-between items-center mt-8">
          <button
            onClick={() => pagination.prev && onPaginationClick(pagination.prev)}
            disabled={!pagination.prev}
            className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg inline-flex items-center transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Previous page"
          >
            <LeftArrowIcon className="w-5 h-5 mr-2" />
            <span>Previous</span>
          </button>
          <button
            onClick={() => pagination.next && onPaginationClick(pagination.next)}
            disabled={!pagination.next}
            className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg inline-flex items-center transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Next page"
          >
            <span>Next</span>
            <RightArrowIcon className="w-5 h-5 ml-2" />
          </button>
        </div>
      )}
    </>
  );
};

export default CatalogNavigation;
