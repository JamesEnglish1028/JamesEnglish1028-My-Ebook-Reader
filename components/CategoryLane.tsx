import React, { useRef } from 'react';

import { proxiedUrl } from '../services/utils';
import type { CatalogBook, CategoryLane as CategoryLaneType } from '../types';
import './collection-lane.css';

interface CategoryLaneProps {
  categoryLane: CategoryLaneType;
  onBookClick: (book: CatalogBook) => void;
}

export const CategoryLaneComponent: React.FC<CategoryLaneProps> = ({
  categoryLane,
  onBookClick,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  if (categoryLane.books.length === 0) return null;

  // Get icon for category based on label
  const getCategoryIcon = (label: string) => {
    const lowerLabel = label.toLowerCase();
    if (lowerLabel.includes('art')) return '🎭';
    if (lowerLabel.includes('music')) return '🎵';
    if (lowerLabel.includes('technology')) return '💻';
    if (lowerLabel.includes('science')) return '🔬';
    if (lowerLabel.includes('political')) return '⚖️';
    if (lowerLabel.includes('philosophy')) return '🤔';
    if (lowerLabel.includes('fiction')) return '📚';
    if (lowerLabel.includes('nonfiction')) return '📖';
    if (lowerLabel.includes('social')) return '👥';
    if (lowerLabel.includes('performing')) return '🎪';
    return '📂'; // Default category icon
  };

  return (
    <div className="mb-10">
      {/* Enhanced Category Header */}
      <div className="flex items-center justify-between mb-6 px-4">
        <div className="flex items-center gap-4">
          {/* Enhanced Category Icon */}
          <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-sky-500/20 to-purple-500/20 rounded-xl border border-sky-500/30">
            <span className="text-3xl filter drop-shadow-sm">{getCategoryIcon(categoryLane.category.label)}</span>
          </div>
          
          {/* Enhanced Category Title */}
          <div className="flex flex-col">
            <h3 className="text-2xl font-bold text-white leading-tight tracking-tight">
              {categoryLane.category.label}
            </h3>
            {categoryLane.category.scheme && (
              <span className="text-xs text-slate-400 uppercase tracking-wider font-medium mt-0.5">
                {categoryLane.category.scheme.includes('Simplified') ? 'Simplified' : 
                 categoryLane.category.scheme.includes('fiction') ? 'Fiction' : 'Category'}
              </span>
            )}
          </div>
        </div>
        
        {/* Enhanced Book Count Badge */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-700/80 text-slate-300 text-sm font-medium px-3 py-1.5 rounded-full border border-slate-600/50">
            {categoryLane.books.length} book{categoryLane.books.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Enhanced Scrollable Book Lane */}
      <div className="relative group">
        {/* Enhanced Left Scroll Button */}
        <button
          onClick={scrollLeft}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-gradient-to-r from-slate-900/90 to-slate-800/80 hover:from-slate-800/95 hover:to-slate-700/85 text-white p-3 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 border border-slate-600/50 backdrop-blur-sm"
          aria-label="Scroll left"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Enhanced Right Scroll Button */}
        <button
          onClick={scrollRight}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-gradient-to-r from-slate-900/90 to-slate-800/80 hover:from-slate-800/95 hover:to-slate-700/85 text-white p-3 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 border border-slate-600/50 backdrop-blur-sm"
          aria-label="Scroll right"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Enhanced Horizontal Scrolling Container */}
        <div
          ref={scrollRef}
          className="flex gap-5 overflow-x-auto px-6 py-3 scrollContainer scroll-smooth"
        >
          {categoryLane.books.map((book, index) => (
            <div
              key={`${book.downloadUrl}-${index}`}
              onClick={() => onBookClick(book)}
              className="cursor-pointer group/book relative flex-shrink-0 w-40"
            >
              {/* Enhanced Book Cover */}
              <div className="aspect-[2/3] bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl overflow-hidden shadow-xl transform group-hover/book:scale-105 transition-all duration-300 border border-slate-700/50 group-hover/book:border-sky-500/50">
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
                  <div className="w-full h-full flex items-center justify-center p-4 text-center text-slate-400">
                    <span className="text-sm font-semibold leading-tight">{book.title}</span>
                  </div>
                )}
              </div>

              {/* Enhanced Book Info */}
              <div className="mt-3 space-y-1.5">
                <h4 className="text-sm font-semibold text-white truncate group-hover/book:text-sky-400 transition-colors duration-200 leading-tight">
                  {book.title}
                </h4>
                {book.author && (
                  <p className="text-xs text-slate-400 truncate leading-relaxed">{book.author}</p>
                )}
                {/* Format Badge - positioned consistently with flat view */}
                {book.format && (
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
          ))}
        </div>
      </div>
    </div>
  );
};

export default CategoryLaneComponent;