import React from 'react';
import type { AudienceMode, FictionMode, MediaMode } from '../../../types';

interface FilterOption<T> {
  key: T;
  label: string;
  available: boolean;
}

interface CatalogFiltersProps {
  /** Available audience modes */
  availableAudiences: string[];
  /** Available fiction modes */
  availableFictionModes: string[];
  /** Available media modes */
  availableMediaModes: string[];
  /** Current audience filter */
  audienceMode: AudienceMode;
  /** Current fiction filter */
  fictionMode: FictionMode;
  /** Current media filter */
  mediaMode: MediaMode;
  /** Callback for audience filter change */
  onAudienceChange: (mode: AudienceMode) => void;
  /** Callback for fiction filter change */
  onFictionChange: (mode: FictionMode) => void;
  /** Callback for media filter change */
  onMediaChange: (mode: MediaMode) => void;
}

/**
 * CatalogFilters - Filter controls for OPDS catalog browsing
 * 
 * Provides genre category navigation and audience/fiction/media filters.
 * Only displays filters that have multiple available options.
 */
const CatalogFilters: React.FC<CatalogFiltersProps> = ({
  availableAudiences,
  availableFictionModes,
  availableMediaModes,
  audienceMode,
  fictionMode,
  mediaMode,
  onAudienceChange,
  onFictionChange,
  onMediaChange,
}) => {
  // Build filter options with availability
  const audienceOptions: FilterOption<AudienceMode>[] = [
    { key: 'all', label: 'All Ages', available: true },
    { key: 'adult', label: 'Adult', available: availableAudiences.includes('adult') },
    { key: 'young-adult', label: 'Young Adult', available: availableAudiences.includes('young-adult') },
    { key: 'children', label: 'Children', available: availableAudiences.includes('children') },
  ];

  const fictionOptions: FilterOption<FictionMode>[] = [
    { key: 'all', label: 'All Types', available: true },
    { key: 'fiction', label: 'Fiction', available: availableFictionModes.includes('fiction') },
    { key: 'non-fiction', label: 'Non-Fiction', available: availableFictionModes.includes('non-fiction') },
  ];

  const mediaOptions: FilterOption<MediaMode>[] = [
    { key: 'all', label: 'All Media', available: true },
    { key: 'ebook', label: 'E-Books', available: availableMediaModes.includes('ebook') },
    { key: 'audiobook', label: 'Audiobooks', available: availableMediaModes.includes('audiobook') },
  ];

  // Check if any filters should be displayed
  const showAudienceFilter = availableAudiences.length > 1;
  const showFictionFilter = availableFictionModes.length > 1;
  const showMediaFilter = availableMediaModes.length > 1;

  const showAnyFilters = showAudienceFilter || showFictionFilter || showMediaFilter;

  if (!showAnyFilters) {
    return null;
  }

  return (
    <div className="bg-slate-800/50 rounded-lg p-4 mb-6">
      <h3 className="text-lg font-semibold text-white mb-4">Filter By</h3>
      {/* Filter Controls Row */}
      {(showAudienceFilter || showFictionFilter || showMediaFilter) && (
        <div className="flex flex-wrap gap-4 items-center">
          {/* Audience Filter */}
          {showAudienceFilter && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">Audience:</span>
              <div className="flex gap-1">
                {audienceOptions
                  .filter((option) => option.available)
                  .map((option) => (
                    <button
                      key={option.key}
                      onClick={() => onAudienceChange(option.key)}
                      className={`px-3 py-1 text-sm rounded-md transition-colors ${
                        audienceMode === option.key
                          ? 'bg-blue-600 text-white font-medium'
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
          {showFictionFilter && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">Type:</span>
              <div className="flex gap-1">
                {fictionOptions
                  .filter((option) => option.available)
                  .map((option) => (
                    <button
                      key={option.key}
                      onClick={() => onFictionChange(option.key)}
                      className={`px-3 py-1 text-sm rounded-md transition-colors ${
                        fictionMode === option.key
                          ? 'bg-purple-600 text-white font-medium'
                          : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                      }`}
                    >
                      {option.label.replace('All Types', 'All')}
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Media/Format Filter */}
          {showMediaFilter && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">Format:</span>
              <div className="flex gap-1">
                {mediaOptions
                  .filter((option) => option.available)
                  .map((option) => (
                    <button
                      key={option.key}
                      onClick={() => onMediaChange(option.key)}
                      className={`px-3 py-1 text-sm rounded-md transition-colors ${
                        mediaMode === option.key
                          ? 'bg-indigo-600 text-white font-medium'
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
      )}
    </div>
  );
};

export default CatalogFilters;
