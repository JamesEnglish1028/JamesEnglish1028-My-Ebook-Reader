import React, { useRef } from 'react';

import { proxiedUrl } from '../services/utils';
import type { CatalogBook } from '../types';
import './collection-lane.css';

interface UncategorizedLaneProps {
  books: CatalogBook[];
  onBookClick: (book: CatalogBook) => void;
}

export const UncategorizedLane: React.FC<UncategorizedLaneProps> = ({
  books,
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

  if (books.length === 0) return null;

  return (
    <div className="mb-8">
      {/* Collection Header */}
      <div className="flex items-center justify-between mb-4 px-4">
        <h3 className="text-xl font-semibold text-white">Other Books</h3>
        <div className="text-sm text-slate-400">
          {books.length} book{books.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Scrollable Book Lane */}
      <div className="relative group">
        {/* Left Scroll Button */}
        <button
          onClick={scrollLeft}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-black/60 hover:bg-black/80 text-white p-2 rounded-r-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          aria-label="Scroll left"
        >
          ←
        </button>

        {/* Right Scroll Button */}
        <button
          onClick={scrollRight}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-black/60 hover:bg-black/80 text-white p-2 rounded-l-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          aria-label="Scroll right"
        >
          →
        </button>

        {/* Horizontal Scrolling Container */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto px-4 py-2 scrollContainer"
        >
          {books.map((book, index) => (
            <div
              key={`${book.downloadUrl}-${index}`}
              onClick={() => onBookClick(book)}
              className="cursor-pointer group/book relative flex-shrink-0 w-36"
            >
              {/* Book Cover */}
              <div className="aspect-[2/3] bg-slate-800 rounded-lg overflow-hidden shadow-lg transform group-hover/book:scale-105 transition-transform duration-300">
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
                  <div className="w-full h-full flex items-center justify-center p-3 text-center text-slate-400">
                    <span className="text-xs font-semibold leading-tight">{book.title}</span>
                  </div>
                )}
              </div>

              {/* Book Info */}
              <div className="mt-2 space-y-1">
                <h4 className="text-sm font-semibold text-white truncate group-hover/book:text-sky-400 transition-colors duration-200">
                  {book.title}
                </h4>
                {book.author && (
                  <p className="text-xs text-slate-400 truncate">{book.author}</p>
                )}
                {/* Format Badges - show all available formats */}
                <div className="flex gap-1 flex-wrap">
                  {book.alternativeFormats && book.alternativeFormats.length > 0 ? (
                    // Show all alternative formats
                    book.alternativeFormats.map((fmt: any, idx: number) => (
                      <span 
                        key={`${book.title}-${fmt.format}-${idx}`}
                        className={`inline-block text-white text-[10px] font-bold px-2 py-0.5 rounded ${
                          fmt.format.toUpperCase() === 'PDF' ? 'bg-red-600' : 
                          fmt.format.toUpperCase() === 'AUDIOBOOK' ? 'bg-purple-600' : 
                          'bg-sky-500'
                        }`}
                        title={`Format: ${fmt.format}, MediaType: ${fmt.mediaType}`}
                      >
                        {fmt.format}
                      </span>
                    ))
                  ) : book.format ? (
                    // Show single format
                    <span className={`inline-block text-white text-[10px] font-bold px-2 py-0.5 rounded ${
                      book.format.toUpperCase() === 'PDF' ? 'bg-red-600' : 
                      book.format.toUpperCase() === 'AUDIOBOOK' ? 'bg-purple-600' : 
                      'bg-sky-500'
                    }`}>
                      {book.format}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UncategorizedLane;