import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { db } from '../services/db';
import { BookRecord, ReaderSettings, TocItem, Bookmark, SearchResult, CoverAnimationData, Citation } from '../types';
import { LeftArrowIcon, RightArrowIcon, SettingsIcon, CloseIcon, ListIcon, BookmarkIcon, SearchIcon, AcademicCapIcon } from './icons';
import SettingsPanel from './SettingsPanel';
import TocPanel from './TocPanel';
import SearchPanel from './SearchPanel';
import Spinner from './Spinner';
import CitationModal from './CitationModal';

interface ReaderViewProps {
  bookId: number;
  onClose: () => void;
  animationData: CoverAnimationData | null;
}

const defaultSettings: ReaderSettings = {
  fontSize: 100, // in percent
  theme: 'light',
  flow: 'paginated',
  fontFamily: 'Original',
  citationFormat: 'apa',
};

// Helper functions for localStorage
const getBookmarksForBook = (bookId: number): Bookmark[] => {
    const saved = localStorage.getItem(`ebook-reader-bookmarks-${bookId}`);
    return saved ? JSON.parse(saved) : [];
};

const saveBookmarksForBook = (bookId: number, bookmarks: Bookmark[]) => {
    localStorage.setItem(`ebook-reader-bookmarks-${bookId}`, JSON.stringify(bookmarks));
};

const getCitationsForBook = (bookId: number): Citation[] => {
    const saved = localStorage.getItem(`ebook-reader-citations-${bookId}`);
    return saved ? JSON.parse(saved) : [];
};

const saveCitationsForBook = (bookId: number, citations: Citation[]) => {
    localStorage.setItem(`ebook-reader-citations-${bookId}`, JSON.stringify(citations));
};

const ReaderView: React.FC<ReaderViewProps> = ({ bookId, onClose, animationData }) => {
  const [bookData, setBookData] = useState<BookRecord | null>(null);
  const [rendition, setRendition] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showNavPanel, setShowNavPanel] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showCitationModal, setShowCitationModal] = useState(false);
  const [toc, setToc] = useState<TocItem[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [locationInfo, setLocationInfo] = useState({ currentPage: 0, totalPages: 0, progress: 0 });
  const [controlsVisible, setControlsVisible] = useState(true);
  const [currentCfi, setCurrentCfi] = useState<string | null>(null);
  const [currentChapterLabel, setCurrentChapterLabel] = useState<string>('');
  const [currentHighlightCfi, setCurrentHighlightCfi] = useState<string | null>(null);
  const [animationState, setAnimationState] = useState<'start' | 'expanding' | 'fading' | 'finished'>(
    animationData ? 'start' : 'finished'
  );
  const [isNavReady, setIsNavReady] = useState(false);
  
  const [settings, setSettings] = useState<ReaderSettings>(() => {
    const savedSettings = localStorage.getItem('readerSettings');
    const parsedSettings = savedSettings ? JSON.parse(savedSettings) : {};
    return { ...defaultSettings, ...parsedSettings };
  });

  const viewerRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<any>(null);
  const navigationRef = useRef<any>(null);
  const sliderTimeoutRef = useRef<number | null>(null);
  const latestCfiRef = useRef<string | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const debounceTimeoutRef = useRef<number | null>(null);
  const controlsTimeoutRef = useRef<number | null>(null);

  const isAnyPanelOpen = useMemo(
    () => showSettings || showNavPanel || showSearch,
    [showSettings, showNavPanel, showSearch]
  );

  const clearControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
  }, []);

  const resetControlsTimeout = useCallback(() => {
    clearControlsTimeout();
    if (!isAnyPanelOpen) {
      controlsTimeoutRef.current = window.setTimeout(() => {
        setControlsVisible(false);
      }, 3000);
    }
  }, [isAnyPanelOpen, clearControlsTimeout]);

  // Animation effect to start the cover expansion
  useEffect(() => {
    if (animationState !== 'start') return;
    const timer = setTimeout(() => setAnimationState('expanding'), 50); // Short delay to ensure transition applies
    return () => clearTimeout(timer);
  }, [animationState]);
  
  // Fetch book data once, on mount or when bookId changes
  useEffect(() => {
    const fetchBook = async () => {
      const data = await db.getBook(bookId);
      if (data) {
        setBookData(data);
      } else {
        console.error("Book not found");
        onClose();
      }
    };
    fetchBook();
  }, [bookId, onClose]);
  
  // Initialize epub.js rendition only after animation is finished
  useEffect(() => {
    if (animationState !== 'finished' || !bookData || !viewerRef.current) {
        return;
    }

    setIsLoading(true);

    const ePub = (window as any).ePub;
    const book = ePub(bookData.epubData);
    bookRef.current = book;
    
    if (viewerRef.current) {
      viewerRef.current.innerHTML = '';
      viewerRef.current.style.opacity = '0'; // Keep viewer transparent until content is rendered
    }
    
    const rend = book.renderTo(viewerRef.current, {
        width: '100%',
        height: '100%',
        flow: settings.flow === 'scrolled' ? 'scrolled-doc' : 'paginated',
        manager: 'default',
        spread: 'auto',
    });
    setRendition(rend);
      
    book.loaded.navigation.then((nav: any) => {
      setToc(nav.toc);
      navigationRef.current = nav;
      setIsNavReady(true);
    });

    rend.on('relocated', (location: any) => {
      const cfi = location.start.cfi;
      setCurrentCfi(cfi);

      if (cfi) {
        latestCfiRef.current = cfi;
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = window.setTimeout(() => {
          localStorage.setItem(`ebook-reader-pos-${bookId}`, cfi);
        }, 1000);
      }

      if (book.locations?.length() > 0) {
        const page = book.locations.locationFromCfi(location.start.cfi);
        const progress = book.locations.percentageFromCfi(location.start.cfi);
        setLocationInfo({
          currentPage: page + 1,
          totalPages: book.locations.length(),
          progress: Math.round(progress * 100),
        });
      }
    });

    book.ready.then(async () => {
        await book.locations.generate(1600);
        setLocationInfo(prev => ({ ...prev, totalPages: book.locations.length(), currentPage: 1 }));

        setBookmarks(getBookmarksForBook(bookId));
        setCitations(getCitationsForBook(bookId));
        
        // Determine starting location before displaying anything
        let startLocation = localStorage.getItem(`ebook-reader-pos-${bookId}`);

        if (!startLocation) {
          const findFirstChapter = async () => {
            // Method 1: Check EPUB 3 landmarks for 'bodymatter'.
            if (book.navigation?.landmarks?.length > 0) {
              const bodyMatter = book.navigation.landmarks.find((l: any) => l.type?.includes('bodymatter'));
              if (bodyMatter?.href) return bodyMatter.href;
            }
    
            // Method 2: Check EPUB 2 <guide> element for 'text'.
            if (book.packaging?.guide?.length > 0) {
              const textReference = book.packaging.guide.find((ref: any) => ref.type?.toLowerCase().includes('text'));
              if (textReference?.href) return textReference.href;
            }
            
            // Method 3: Fallback - Scan the spine.
            for (const item of book.spine.items) {
              try {
                const section = await book.spine.get(item.href);
                if (!section) continue;
    
                const doc = await section.load();
                const body = doc?.body;
                
                let isLikelyContentPage = false;
                if (body) {
                  const textContent = body.textContent || '';
                  if (textContent.trim().length > 300) {
                    isLikelyContentPage = true;
                  }
                }
                
                section.unload();
    
                if (isLikelyContentPage) return item.href;
              } catch (error) {
                 console.warn(`Could not parse section ${item.href} when searching for first chapter. Skipping.`, error);
              }
            }
            
            // Final Fallback
            return book.spine.items.length > 0 ? book.spine.items[0].href : undefined;
          };
          
          startLocation = await findFirstChapter();
        }
        
        await rend.display(startLocation || undefined);
        
        setIsLoading(false);
        
        // Fade in the viewer content now that it's rendered
        if (viewerRef.current) {
            viewerRef.current.style.transition = 'opacity 0.3s ease-in';
            viewerRef.current.style.opacity = '1';
        }
    });

    return () => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        if (latestCfiRef.current) {
            localStorage.setItem(`ebook-reader-pos-${bookId}`, latestCfiRef.current);
        }
        setIsNavReady(false);
        navigationRef.current = null;
        book.destroy();
    };
  }, [bookId, bookData, settings.flow, animationState]);

  useEffect(() => {
    if (rendition) {
        const lightTheme = { body: { 'color': '#000', 'background': '#fff' } };
        const darkTheme = { body: { 'color': '#fff', 'background': '#1f2937' } };
        rendition.themes.register('light', lightTheme);
        rendition.themes.register('dark', darkTheme);
        rendition.themes.select(settings.theme);
        rendition.themes.fontSize(`${settings.fontSize}%`);
        if (settings.fontFamily === 'Original') {
            rendition.themes.font('inherit');
        } else if (settings.fontFamily === 'Serif') {
            rendition.themes.font('Georgia, "Times New Roman", serif');
        } else if (settings.fontFamily === 'Sans-Serif') {
            rendition.themes.font('"Helvetica Neue", Helvetica, Arial, sans-serif');
        }
    }
    localStorage.setItem('readerSettings', JSON.stringify(settings));
  }, [rendition, settings]);

  useEffect(() => {
    if (rendition) {
      const timer = setTimeout(() => rendition.resize(), 50);
      return () => clearTimeout(timer);
    }
  }, [controlsVisible, rendition]);

  useEffect(() => {
    if (controlsVisible && !isAnyPanelOpen) {
      resetControlsTimeout();
    } else {
      clearControlsTimeout();
    }
    if (isAnyPanelOpen && !controlsVisible) setControlsVisible(true);
    return clearControlsTimeout;
  }, [controlsVisible, isAnyPanelOpen, resetControlsTimeout, clearControlsTimeout]);

  // Effect to get the current chapter label once navigation is ready and location changes
  useEffect(() => {
    if (currentCfi && isNavReady && navigationRef.current) {
      const nav = navigationRef.current;
      const tocItemPromise = nav.get(currentCfi);
      if (tocItemPromise && typeof tocItemPromise.then === 'function') {
        tocItemPromise.then((tocItem: any) => {
          if (tocItem && tocItem.label) {
            setCurrentChapterLabel(tocItem.label.trim());
          }
        });
      }
    }
  }, [currentCfi, isNavReady]);

  const nextPage = useCallback(() => { rendition?.next(); setControlsVisible(true); }, [rendition]);
  const prevPage = useCallback(() => { rendition?.prev(); setControlsVisible(true); }, [rendition]);
  
  useEffect(() => {
    if (!rendition) return;

    const clickHandler = (event: PointerEvent) => {
      if (showSettings || showNavPanel || showSearch || !viewerRef.current) return;
      const rect = viewerRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const width = rect.width;
      const clickZone = width * 0.3;

      if (settings.flow === 'paginated') {
          if (x < clickZone) prevPage();
          else if (x > width - clickZone) nextPage();
          else setControlsVisible(v => !v);
      } else {
          setControlsVisible(v => !v);
      }
    };
    rendition.on('click', clickHandler);
    return () => { rendition.off('click', clickHandler); };
  }, [rendition, settings.flow, showSettings, showNavPanel, showSearch, prevPage, nextPage]);

  const handleSettingsChange = (newSettings: Partial<ReaderSettings>) => setSettings(prev => ({ ...prev, ...newSettings }));
  const handleTocNavigate = (href: string) => { rendition?.display(href); setShowNavPanel(false); };
  const handleBookmarkNavigate = (cfi: string) => { rendition?.display(cfi); setShowNavPanel(false); };
  const handleCitationNavigate = (cfi: string) => { rendition?.display(cfi); setShowNavPanel(false); };

  const addBookmark = useCallback(() => {
    if (!latestCfiRef.current) return;
    const description = window.prompt("Add a note for this bookmark (optional):");
    const newBookmark: Bookmark = {
        id: new Date().toISOString(),
        cfi: latestCfiRef.current,
        label: `Page ${locationInfo.currentPage} (${locationInfo.progress}%)`,
        chapter: currentChapterLabel,
        description: description || undefined,
        createdAt: Date.now(),
    };
    const updatedBookmarks = [...bookmarks, newBookmark];
    setBookmarks(updatedBookmarks);
    saveBookmarksForBook(bookId, updatedBookmarks);
  }, [bookId, bookmarks, locationInfo.currentPage, locationInfo.progress, currentChapterLabel]);

  const deleteBookmark = useCallback((bookmarkId: string) => {
      const updatedBookmarks = bookmarks.filter(b => b.id !== bookmarkId);
      setBookmarks(updatedBookmarks);
      saveBookmarksForBook(bookId, updatedBookmarks);
  }, [bookId, bookmarks]);

  const handleSaveCitation = useCallback((note: string) => {
    if (!latestCfiRef.current) return;
    const newCitation: Citation = {
        id: new Date().toISOString(),
        cfi: latestCfiRef.current,
        note: note,
        createdAt: Date.now(),
    };
    const updatedCitations = [...citations, newCitation];
    setCitations(updatedCitations);
    saveCitationsForBook(bookId, updatedCitations);
    setShowCitationModal(false);
  }, [bookId, citations]);

  const deleteCitation = useCallback((citationId: string) => {
      const updatedCitations = citations.filter(c => c.id !== citationId);
      setCitations(updatedCitations);
      saveCitationsForBook(bookId, updatedCitations);
  }, [bookId, citations]);

  const isCurrentPageBookmarked = useMemo(() => bookmarks.some(b => b.cfi === currentCfi), [bookmarks, currentCfi]);

  const toggleBookmark = useCallback(() => {
      if (isCurrentPageBookmarked) {
          const bookmarkToRemove = bookmarks.find(b => b.cfi === currentCfi);
          if (bookmarkToRemove) deleteBookmark(bookmarkToRemove.id);
      } else {
          addBookmark();
      }
  }, [isCurrentPageBookmarked, addBookmark, deleteBookmark, bookmarks, currentCfi]);

  const performSearch = useCallback(async (query: string) => {
    if (!query || !bookRef.current) {
        setSearchResults([]);
        setIsSearching(false);
        return;
    }
    if (currentHighlightCfi && rendition) {
        rendition.annotations.remove(currentHighlightCfi, 'highlight');
        setCurrentHighlightCfi(null);
    }
    try {
        const book = bookRef.current;
        const searchPromises = book.spine.spineItems.map((item: any) => 
            item.load(book.load.bind(book)).then(() => {
                const results = item.find(query.trim());
                item.unload();
                return Promise.resolve(results);
            }).catch(() => { item.unload(); return Promise.resolve([]); })
        );
        const nestedResults = await Promise.all(searchPromises);
        setSearchResults([].concat(...nestedResults));
    } catch (err) {
        console.error("Search failed:", err);
        setSearchResults([]);
    } finally {
        setIsSearching(false);
    }
  }, [rendition, currentHighlightCfi]);

  const handleQueryChange = useCallback((query: string) => {
    setSearchQuery(query);
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);

    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    
    // Set a timeout to perform the search after a delay
    debounceTimeoutRef.current = window.setTimeout(() => {
      setIsSearching(true); // Show spinner right before search starts
      performSearch(query);
    }, 500);
  }, [performSearch]);

  const handleNavigateToResult = useCallback((cfi: string) => {
    if (!rendition) return;
  
    // Remove the previous highlight first
    if (currentHighlightCfi) {
      rendition.annotations.remove(currentHighlightCfi, 'highlight');
    }
  
    // Close the panel to reveal the content
    setShowSearch(false);
  
    // Navigate to the new CFI and highlight it
    rendition.display(cfi).then(() => {
      rendition.annotations.add('highlight', cfi, {}, undefined, 'hl', { 'fill': 'yellow', 'fill-opacity': '0.3' });
      setCurrentHighlightCfi(cfi);
    });
  }, [rendition, currentHighlightCfi]);

  const handleCloseSearch = () => {
    setShowSearch(false);
    if (currentHighlightCfi && rendition) {
        rendition.annotations.remove(currentHighlightCfi, 'highlight');
        setCurrentHighlightCfi(null);
    }
  };
  
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (rendition && bookRef.current?.locations) {
      setControlsVisible(true);
      const newProgress = parseInt(e.target.value, 10);
      setLocationInfo(prev => ({ ...prev, progress: newProgress }));
      if (sliderTimeoutRef.current) clearTimeout(sliderTimeoutRef.current);
      sliderTimeoutRef.current = window.setTimeout(() => {
        const cfi = bookRef.current.locations.cfiFromPercentage(newProgress / 100);
        rendition.display(cfi);
      }, 150);
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (settings.flow !== 'paginated') return;
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (settings.flow !== 'paginated' || touchStartXRef.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    if (deltaX > 50) prevPage();
    else if (deltaX < -50) nextPage();
    touchStartXRef.current = null;
  };


  return (
    <>
      {animationData && animationState !== 'finished' && (
          <div
              className="fixed inset-0 bg-slate-900 z-50 flex justify-center items-center"
              style={{
                  opacity: animationState === 'fading' ? 0 : 1,
                  transition: 'opacity 0.4s ease-in',
              }}
              onTransitionEnd={() => {
                  if (animationState === 'fading') setAnimationState('finished');
              }}
          >
              {animationData.coverImage && (
                  <img
                      src={animationData.coverImage}
                      alt="Expanding book cover"
                      className="object-contain rounded-lg shadow-2xl"
                      style={
                          animationState === 'start'
                          ? { // Initial position from library
                              position: 'absolute',
                              top: `${animationData.rect.top}px`,
                              left: `${animationData.rect.left}px`,
                              width: `${animationData.rect.width}px`,
                              height: `${animationData.rect.height}px`,
                              transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                          }
                          : { // Expanded position in center
                              position: 'absolute',
                              top: '50%',
                              left: '50%',
                              transform: 'translate(-50%, -50%)',
                              width: 'auto',
                              height: '80vh',
                              transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                          }
                      }
                      onTransitionEnd={() => {
                          if (animationState === 'expanding') {
                              setTimeout(() => setAnimationState('fading'), 200);
                          }
                      }}
                  />
              )}
          </div>
      )}
      <div
        className="fixed inset-0 bg-slate-900 flex flex-col select-none"
        style={{
          opacity: animationState === 'fading' || animationState === 'finished' ? 1 : 0,
          transition: 'opacity 0.5s ease-out',
          transitionDelay: animationState === 'fading' ? '0.2s' : '0s',
        }}
      >
        <header
          className={`grid grid-cols-3 items-center p-2 bg-slate-800 shadow-md z-20 text-white flex-shrink-0 transition-transform duration-300 ease-in-out ${controlsVisible ? 'translate-y-0' : '-translate-y-full'}`}
          onMouseEnter={clearControlsTimeout}
          onMouseLeave={resetControlsTimeout}
        >
          <div className="flex items-center gap-2">
              <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700 transition-colors" aria-label="Close Reader">
                  <CloseIcon className="w-6 h-6" />
              </button>
              <button onClick={() => setShowNavPanel(true)} className="p-2 rounded-full hover:bg-slate-700 transition-colors relative" aria-label="Contents and Bookmarks">
                  <ListIcon className="w-6 h-6" />
                   {(bookmarks.length > 0 || citations.length > 0) && (
                      <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-sky-400 ring-2 ring-slate-800"></span>
                  )}
              </button>
          </div>
          <div className="text-center truncate px-2">
              <h2 className="text-lg font-bold">{bookData?.title || 'Loading...'}</h2>
              <p className="text-sm text-slate-400">{bookData?.author}</p>
          </div>
          <div className="flex justify-end items-center gap-2">
              <button onClick={() => setShowSearch(true)} className="p-2 rounded-full hover:bg-slate-700 transition-colors" aria-label="Search in book">
                <SearchIcon className="w-6 h-6" />
              </button>
              <button onClick={() => setShowCitationModal(true)} className="p-2 rounded-full hover:bg-slate-700 transition-colors" aria-label="Create citation for this page">
                  <AcademicCapIcon className="w-6 h-6" />
              </button>
              <button onClick={toggleBookmark} className="p-2 rounded-full hover:bg-slate-700 transition-colors" aria-label={isCurrentPageBookmarked ? "Remove bookmark from this page" : "Add bookmark to this page"}>
                  <BookmarkIcon className="w-6 h-6" filled={isCurrentPageBookmarked} />
              </button>
              <button onClick={() => setShowSettings(true)} className="p-2 rounded-full hover:bg-slate-700 transition-colors" aria-label="Settings">
                  <SettingsIcon className="w-6 h-6" />
              </button>
          </div>
        </header>

        <div
          className="flex-grow relative min-h-0"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-30">
              <Spinner text="Loading Book..." />
            </div>
          )}
          <div ref={viewerRef} id="viewer" className="w-full h-full" />
        </div>

        <footer
          className={`flex items-center gap-4 p-4 bg-slate-800 z-20 text-white flex-shrink-0 transition-transform duration-300 ease-in-out ${controlsVisible ? 'translate-y-0' : 'translate-y-full'}`}
          onMouseEnter={clearControlsTimeout}
          onMouseLeave={resetControlsTimeout}
        >
            {settings.flow === 'paginated' ? (
                <button onClick={prevPage} className="p-2 rounded-full hover:bg-slate-700 transition-colors flex-shrink-0" aria-label="Previous Page">
                    <LeftArrowIcon className="w-6 h-6" />
                </button>
            ) : <div className="w-10 h-10 flex-shrink-0" /> /* Placeholder to keep layout consistent */}
            
            <div className="flex-grow flex flex-col justify-center">
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={locationInfo.progress || 0}
                    onChange={handleSliderChange}
                    className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Book progress"
                    disabled={locationInfo.totalPages === 0}
                />
                <div className="text-center text-sm text-slate-300 mt-2" aria-live="polite">
                    {locationInfo.totalPages > 0 ? (
                        <span>Page {locationInfo.currentPage} of {locationInfo.totalPages} &bull; {locationInfo.progress}%</span>
                    ) : (
                        <span className="text-slate-400">Calculating progress...</span>
                    )}
                </div>
            </div>

            {settings.flow === 'paginated' ? (
                <button onClick={nextPage} className="p-2 rounded-full hover:bg-slate-700 transition-colors flex-shrink-0" aria-label="Next Page">
                    <RightArrowIcon className="w-6 h-6" />
                </button>
            ) : <div className="w-10 h-10 flex-shrink-0" /> /* Placeholder */}
        </footer>

        <TocPanel
          isOpen={showNavPanel}
          onClose={() => setShowNavPanel(false)}
          toc={toc}
          onTocNavigate={handleTocNavigate}
          bookmarks={bookmarks}
          onBookmarkNavigate={handleBookmarkNavigate}
          onDeleteBookmark={deleteBookmark}
          citations={citations}
          onCitationNavigate={handleCitationNavigate}
          onDeleteCitation={deleteCitation}
          settings={settings}
          bookData={bookData}
        />
        <SearchPanel
          isOpen={showSearch}
          onClose={handleCloseSearch}
          onQueryChange={handleQueryChange}
          onNavigate={handleNavigateToResult}
          results={searchResults}
          isLoading={isSearching}
          searchQuery={searchQuery}
        />
        <SettingsPanel
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          settings={settings}
          onSettingsChange={handleSettingsChange}
        />
        <CitationModal
          isOpen={showCitationModal}
          onClose={() => setShowCitationModal(false)}
          onSave={handleSaveCitation}
        />
      </div>
    </>
  );
};

export default ReaderView;