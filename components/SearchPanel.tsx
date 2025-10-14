import React from 'react';

import type { SearchResult } from '../types';

import { CloseIcon, SearchIcon } from './icons';
import Spinner from './Spinner';

interface SearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onQueryChange: (query: string) => void;
  onNavigate: (cfi: string) => void;
  results: SearchResult[];
  isLoading: boolean;
  searchQuery: string;
}

const SearchResultExcerpt: React.FC<{ excerpt: string; query: string }> = ({ excerpt, query }) => {
    if (!query) return <span>{excerpt}</span>;

    const queryLower = query.toLowerCase();
    // Normalize whitespace in excerpt to handle line breaks etc. from epub content
    const normalizedExcerpt = excerpt.replace(/\s+/g, ' ').trim();
    const excerptLower = normalizedExcerpt.toLowerCase();
    const queryIndex = excerptLower.indexOf(queryLower);

    if (queryIndex === -1) {
        // Fallback for safety, query should always be in the excerpt. Highlight within original.
        const parts = excerpt.split(new RegExp(`(${query})`, 'gi'));
        return (
            <span className="text-sm text-slate-300 group-hover:text-slate-100 transition-colors">
                {parts.map((part, i) =>
                    part.toLowerCase() === queryLower ? (
                        <strong key={i} className="text-sky-300 bg-sky-800/50 font-normal rounded">
                            {part}
                        </strong>
                    ) : (
                        <span key={i}>{part}</span>
                    ),
                )}
            </span>
        );
    }

    // Find the start of the sentence containing the query.
    let sentenceStartIndex = normalizedExcerpt.lastIndexOf('.', queryIndex);
    sentenceStartIndex = Math.max(sentenceStartIndex, normalizedExcerpt.lastIndexOf('!', queryIndex));
    sentenceStartIndex = Math.max(sentenceStartIndex, normalizedExcerpt.lastIndexOf('?', queryIndex));

    // Find the end of the sentence.
    let sentenceEndIndex = normalizedExcerpt.indexOf('.', queryIndex + query.length);
    if (sentenceEndIndex === -1) sentenceEndIndex = Infinity;

    let tempEndIndex = normalizedExcerpt.indexOf('!', queryIndex + query.length);
    if (tempEndIndex !== -1) sentenceEndIndex = Math.min(sentenceEndIndex, tempEndIndex);

    tempEndIndex = normalizedExcerpt.indexOf('?', queryIndex + query.length);
    if (tempEndIndex !== -1) sentenceEndIndex = Math.min(sentenceEndIndex, tempEndIndex);

    // If no end punctuation, the sentence might run to the end of the excerpt.
    if (sentenceEndIndex === Infinity) {
        sentenceEndIndex = normalizedExcerpt.length;
    } else {
        sentenceEndIndex++; // Include the punctuation mark itself
    }

    // If no start punctuation, sentence starts at the beginning of the excerpt.
    if (sentenceStartIndex === -1) {
        sentenceStartIndex = 0;
    } else {
        sentenceStartIndex++; // Move past the punctuation mark.
    }
    
    // Extract the potential sentence.
    const snippet = normalizedExcerpt.substring(sentenceStartIndex, sentenceEndIndex).trim();
    
    // Add ellipsis if the extracted snippet seems to be a fragment.
    const leadingEllipsis = sentenceStartIndex > 0;
    const trailingEllipsis = sentenceEndIndex < normalizedExcerpt.length;

    // Split the final snippet for highlighting.
    const parts = snippet.split(new RegExp(`(${query})`, 'gi'));
    
    return (
        <span className="text-sm text-slate-300 group-hover:text-slate-100 transition-colors">
            {leadingEllipsis && '...'}
            {parts.map((part, i) =>
                part.toLowerCase() === queryLower ? (
                    <strong key={i} className="text-sky-300 bg-sky-800/50 font-normal rounded">
                        {part}
                    </strong>
                ) : (
                    <span key={i}>{part}</span>
                ),
            )}
            {trailingEllipsis && '...'}
        </span>
    );
};


const SearchPanel: React.FC<SearchPanelProps> = ({
  isOpen,
  onClose,
  onQueryChange,
  onNavigate,
  results,
  isLoading,
  searchQuery,
}) => {

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 z-30"
        onClick={onClose}
        aria-hidden="true"
       />
      <div
        className={`fixed top-0 left-0 h-full w-80 bg-slate-800 shadow-2xl z-40 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="search-heading"
      >
        <div className="p-4 border-b border-slate-700 flex justify-between items-center flex-shrink-0">
          <h3 id="search-heading" className="text-xl font-semibold text-white">Search</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700" aria-label="Close search">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4 border-b border-slate-700 flex-shrink-0">
            <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <SearchIcon className="w-5 h-5 text-slate-400" />
                </span>
                <input
                    type="search"
                    placeholder="Search in book..."
                    value={searchQuery}
                    onChange={(e) => onQueryChange(e.target.value)}
                    className="w-full bg-slate-700 text-white rounded-md pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                    aria-label="Search input"
                    autoFocus
                />
            </div>
        </div>

        <div className="overflow-y-auto flex-grow">
            {isLoading ? (
                <div className="flex justify-center items-center h-full">
                    <Spinner text="Searching..." />
                </div>
            ) : searchQuery && results.length > 0 ? (
                <>
                    <p className="text-xs text-slate-400 px-4 pt-4 pb-2">{results.length} result{results.length !== 1 && 's'} found for "{searchQuery}"</p>
                    <ul className="divide-y divide-slate-700">
                        {results.map((result, index) => (
                            <li key={index} className="group">
                                <button onClick={() => onNavigate(result.cfi)} className="w-full text-left p-4 hover:bg-sky-500/10 transition-colors">
                                    <SearchResultExcerpt excerpt={result.excerpt.trim()} query={searchQuery} />
                                </button>
                            </li>
                        ))}
                    </ul>
                </>
            ) : searchQuery && results.length === 0 ? (
                <p className="p-8 text-slate-400 text-center">No results found for "{searchQuery}".</p>
            ) : (
                <p className="p-8 text-slate-400 text-center">Enter a term above to search the book.</p>
            )}
        </div>
      </div>
    </>
  );
};

export default SearchPanel;