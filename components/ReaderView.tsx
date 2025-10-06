

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { db } from '../services/db';
import { BookRecord, ReaderSettings, TocItem, Bookmark, SearchResult, CoverAnimationData, Citation } from '../types';
import { LeftArrowIcon, RightArrowIcon, SettingsIcon, CloseIcon, ListIcon, BookmarkIcon, SearchIcon, AcademicCapIcon, PlayIcon, PauseIcon } from './icons';
import SettingsPanel from './SettingsPanel';
import TocPanel from './TocPanel';
import SearchPanel from './SearchPanel';
import Spinner from './Spinner';
import CitationModal from './CitationModal';
import BookmarkModal from './BookmarkModal';
import {
  getReaderSettings,
  saveReaderSettings,
  getBookmarksForBook,
  saveBookmarksForBook,
  getCitationsForBook,
  saveCitationsForBook,
  getLastPositionForBook,
  saveLastPositionForBook,
  getLastSpokenPositionForBook,
  saveLastSpokenPositionForBook,
  performBookSearch,
  findFirstChapter
} from '../services/readerUtils';


interface ReaderViewProps {
  bookId: number;
  onClose: () => void;
  animationData: CoverAnimationData | null;
}

// --- Read Aloud Helpers ---

// A list of common English abbreviations that might be mistaken for sentence endings.
const ABBREVIATIONS = [
  'Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'Sr', 'Jr', 'Sen', 'Rep', 'Gov', 'Gen', 'Hon', // Titles
  'Sgt', 'Capt', 'Col', 'Lt', // Military
  'St', 'Ave', 'Blvd', // Locations
  'etc', 'i.e', 'e.g', 'vs', 'al', 'op', 'cit' // Latin & Common
];

// This regex improves sentence detection by handling common abbreviations and multiple punctuation marks (like ellipses).
const SENTENCE_REGEX = new RegExp(
    `(?:.+?)` + // Non-greedy match for sentence content.
    `(?<!\\b(?:${ABBREVIATIONS.join('|')}))` + // Negative lookbehind: ensure what comes before the period is NOT a known abbreviation.
    `\\.` + // Match the period.
    `[.!?]*` + // Match any subsequent punctuation (for ellipses, etc.).
    `\\s*` + // Include trailing whitespace.
    `|` + // OR
    `(?:.+?)` + // Non-greedy match for sentence content.
    `[?!]+` + // Match '?' or '!', which are unambiguous sentence endings.
    `[.!?]*` + // Match any subsequent punctuation (for "?!").
    `\\s*`, // Include trailing whitespace.
    'g'
);


const findSentenceRange = (text: string, index: number): { start: number; end: number; sentence: string } | null => {
    SENTENCE_REGEX.lastIndex = 0; // Reset regex state for global flag
    let match;
    while ((match = SENTENCE_REGEX.exec(text)) !== null) {
        const fullMatch = match[0];
        const matchStart = match.index;
        const matchEnd = matchStart + fullMatch.length;

        if (index >= matchStart && index < matchEnd) {
            const trimmedSentence = fullMatch.trim();
            const textStartIndexInMatch = fullMatch.search(/\S/);
            if (textStartIndexInMatch === -1) { 
                continue;
            }
            const startOffset = matchStart + textStartIndexInMatch;
            const endOffset = startOffset + trimmedSentence.length;

            return { start: startOffset, end: endOffset, sentence: trimmedSentence };
        }
    }
    return null;
};

const findDomRangeFromCharacterOffsets = (root: Node, startOffset: number, endOffset: number): Range | null => {
    const doc = root.ownerDocument;
    if (!doc) return null;

    const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let charCount = 0;
    let startNode: Node | null = null;
    let startNodeOffset = 0;
    let endNode: Node | null = null;
    let endNodeOffset = 0;
    let currentNode: Node | null;

    while (currentNode = walker.nextNode()) {
        const nodeText = currentNode.textContent || '';
        const nodeLength = nodeText.length;
        const nextCharCount = charCount + nodeLength;

        if (startNode === null && startOffset >= charCount && startOffset < nextCharCount) {
            startNode = currentNode;
            startNodeOffset = startOffset - charCount;
        }

        if (endNode === null && endOffset > charCount && endOffset <= nextCharCount) {
            endNode = currentNode;
            endNodeOffset = endOffset - charCount;
        }
        
        if (startNode && endNode) {
            break; // Found both, exit loop
        }
        charCount = nextCharCount;
    }
    
    if (startNode && endNode) {
        const range = doc.createRange();
        try {
            range.setStart(startNode, startNodeOffset);
            range.setEnd(endNode, endNodeOffset);
            return range;
        } catch (e) {
            console.error("Error creating DOM range:", e);
            return null;
        }
    }
    return null;
};


const ReaderView: React.FC<ReaderViewProps> = ({ bookId, onClose, animationData }) => {
  const [bookData, setBookData] = useState<BookRecord | null>(null);
  const [rendition, setRendition] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showNavPanel, setShowNavPanel] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showCitationModal, setShowCitationModal] = useState(false);
  const [showBookmarkModal, setShowBookmarkModal] = useState(false);
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
  const [speechState, setSpeechState] = useState<'stopped' | 'playing' | 'paused'>('stopped');
  
  const [settings, setSettings] = useState<ReaderSettings>(getReaderSettings);

  const viewerRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<any>(null);
  const renditionRef = useRef<any>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const speechStateRef = useRef(speechState);
  speechStateRef.current = speechState;
  const navigationRef = useRef<any>(null);
  const sliderTimeoutRef = useRef<number | null>(null);
  const latestCfiRef = useRef<string | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const debounceTimeoutRef = useRef<number | null>(null);
  const controlsTimeoutRef = useRef<number | null>(null);
  const locationsReadyRef = useRef(false);
  const highlightedCfiRef = useRef<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const lastSpokenCfiRef = useRef<string | null>(null);
  const speechStartCfiRef = useRef<string | null>(null);
  const currentSentenceRef = useRef<string>('');
  const speechContextRef = useRef<{ rawText: string, normalizedText: string, startIndexInNormalized: number } | null>(null);
  const isAutoPagingRef = useRef(false);


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

  // Smart default voice selection effect
  useEffect(() => {
    const setDefaultVoice = () => {
      const currentSettings = getReaderSettings();
      if (currentSettings.readAloud.voiceURI) {
        return; 
      }
  
      const availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices.length === 0) {
        return;
      }
  
      let bestVoice = availableVoices.find(v => v.default) ||
                      availableVoices.find(v => v.lang === 'en-US' && /google/i.test(v.name)) ||
                      availableVoices.find(v => v.lang === 'en-US' && /microsoft/i.test(v.name)) ||
                      availableVoices.find(v => v.lang === 'en-US' && v.localService) ||
                      availableVoices.find(v => v.lang === 'en-US') ||
                      null;
  
      if (bestVoice) {
        setSettings(prevSettings => {
          const newReadAloudSettings = { ...prevSettings.readAloud, voiceURI: bestVoice!.voiceURI };
          const newSettings = { ...prevSettings, readAloud: newReadAloudSettings };
          saveReaderSettings(newSettings); 
          return newSettings;
        });
      }
    };
  
    if (window.speechSynthesis.getVoices().length > 0) {
      setDefaultVoice();
    } else {
      window.speechSynthesis.onvoiceschanged = setDefaultVoice;
    }
    
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const saveLastSpokenPosition = useCallback(() => {
    if (lastSpokenCfiRef.current) {
        saveLastSpokenPositionForBook(bookId, lastSpokenCfiRef.current);
    }
  }, [bookId]);

  const removeHighlight = useCallback(() => {
    if (highlightedCfiRef.current && renditionRef.current) {
        renditionRef.current.annotations.remove(highlightedCfiRef.current, 'highlight');
        highlightedCfiRef.current = null;
    }
  }, []);

  const stopSpeech = useCallback(() => {
      if (speechStateRef.current !== 'stopped') {
          saveLastSpokenPosition();
      }
      setSpeechState('stopped');
      window.speechSynthesis.cancel();
      isAutoPagingRef.current = false;
      removeHighlight();
      utteranceRef.current = null;
      lastSpokenCfiRef.current = null;
      currentSentenceRef.current = '';
  }, [removeHighlight, saveLastSpokenPosition]);
  
  const startSpeech = useCallback(() => {
    const currentRendition = renditionRef.current;
    if (!currentRendition) return;
    
    if (speechStateRef.current !== 'stopped') {
        window.speechSynthesis.cancel();
        removeHighlight();
    }

    const contents = currentRendition.getContents();
    if (!contents || contents.length === 0) return;
    
    const body = contents[0].document?.body;
    if (!body) return;

    const rawText = body.textContent || '';
    const normalizedText = rawText.replace(/\s+/g, ' ').trim();
    if (!normalizedText) {
        if (settingsRef.current.flow === 'paginated' && speechStateRef.current === 'playing') {
            isAutoPagingRef.current = true;
            currentRendition.next();
        }
        return;
    }
    
    let textToRead = normalizedText;
    let startIndexInNormalized = 0;
    const startCfi = speechStartCfiRef.current;

    if (startCfi) {
        try {
            const range = contents[0].range(startCfi);
            if (range) {
                const textForCfi = range.toString().replace(/\s+/g, ' ').trim();
                const searchIndex = normalizedText.indexOf(textForCfi);
                if (searchIndex !== -1) {
                    startIndexInNormalized = searchIndex;
                    textToRead = normalizedText.substring(startIndexInNormalized);
                }
            }
        } catch (e) {
            console.error("Could not find start CFI for speech, starting from beginning.", e);
        } finally {
            speechStartCfiRef.current = null;
        }
    }

    speechContextRef.current = { rawText, normalizedText, startIndexInNormalized };
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utteranceRef.current = utterance;
    
    const voices = window.speechSynthesis.getVoices();
    const currentSettings = settingsRef.current;
    const selectedVoice = voices.find(v => v.voiceURI === currentSettings.readAloud.voiceURI);
    
    utterance.voice = selectedVoice || null;
    utterance.rate = currentSettings.readAloud.rate;
    utterance.pitch = currentSettings.readAloud.pitch;
    utterance.volume = currentSettings.readAloud.volume;
    
    utterance.onboundary = (event) => {
        if (event.name !== 'word' || !renditionRef.current || !body || !speechContextRef.current) return;
        
        const { rawText, normalizedText, startIndexInNormalized } = speechContextRef.current;
        const absoluteCharIndex = event.charIndex + startIndexInNormalized;
        const sentenceInfo = findSentenceRange(normalizedText, absoluteCharIndex);
        
        if (!sentenceInfo || sentenceInfo.sentence === currentSentenceRef.current) {
            return;
        }
        currentSentenceRef.current = sentenceInfo.sentence;
        
        try {
            const estimatedRawIndex = (absoluteCharIndex / normalizedText.length) * rawText.length;
            
            let bestMatchIndex = -1;
            let minDistance = Infinity;
            let currentIndex = -1;

            while ((currentIndex = rawText.indexOf(sentenceInfo.sentence, currentIndex + 1)) !== -1) {
                const distance = Math.abs(currentIndex - estimatedRawIndex);
                if (distance < minDistance) {
                    minDistance = distance;
                    bestMatchIndex = currentIndex;
                }
            }

            if (bestMatchIndex !== -1) {
                const rawStartOffset = bestMatchIndex;
                const rawEndOffset = bestMatchIndex + sentenceInfo.sentence.length;
                const domRange = findDomRangeFromCharacterOffsets(body, rawStartOffset, rawEndOffset);
                
                if (domRange) {
                    const contents = renditionRef.current.getContents()[0];
                    const cfi = contents.cfiFromRange(domRange);
                    if (cfi) {
                        lastSpokenCfiRef.current = cfi;
                        removeHighlight();
                        renditionRef.current.annotations.add('highlight', cfi, {}, undefined, 'tts-highlight', {
                            'fill': 'rgba(0, 191, 255, 0.4)',
                        });
                        highlightedCfiRef.current = cfi;
                        
                        if (settingsRef.current.flow === 'scrolled') {
                            const iframe = viewerRef.current?.querySelector('iframe');
                            const elementToScroll = domRange.startContainer.parentElement;

                            if (elementToScroll && iframe) {
                                const elementRect = elementToScroll.getBoundingClientRect();
                                const iframeRect = iframe.getBoundingClientRect();
                                
                                const elementTopInIframe = elementRect.top - iframeRect.top;
                                const elementBottomInIframe = elementRect.bottom - iframeRect.top;
                                
                                const iframeVisibleHeight = iframeRect.height;
                                const safeZoneTop = iframeVisibleHeight * 0.3;
                                const safeZoneBottom = iframeVisibleHeight * 0.7;

                                if (elementTopInIframe < safeZoneTop || elementBottomInIframe > safeZoneBottom) {
                                    elementToScroll.scrollIntoView({
                                        behavior: 'smooth',
                                        block: 'center',
                                        inline: 'nearest'
                                    });
                                }
                            }
                        }
                    }
                }
            }
        } catch (e) {
            console.error("Error during sentence highlighting:", e);
        }
    };
    
    utterance.onend = () => {
        removeHighlight();
        
        // If the speech state is not 'playing' when onend fires, it means
        // the event was triggered by a manual pause() or cancel() call.
        // In this case, we should not proceed to the next page.
        if (speechStateRef.current !== 'playing') {
            if (speechStateRef.current === 'paused') {
                return; // Stay in paused state
            }
            setSpeechState('stopped'); // Finalize to stopped state
            return;
        }

        // If we get here, speech ended naturally while in the 'playing' state.
        if (settingsRef.current.flow === 'paginated') {
            isAutoPagingRef.current = true;
            renditionRef.current?.next();
        } else {
            setSpeechState('stopped');
        }
    };
    
    utterance.onerror = (e) => {
        console.error("SpeechSynthesisUtterance error", e);
        stopSpeech();
    };

    window.speechSynthesis.speak(utterance);
    setSpeechState('playing');
  }, [stopSpeech, removeHighlight]);

  // Initialize epub.js rendition only after animation is finished
  useEffect(() => {
    if (animationState !== 'finished' || !bookData || !viewerRef.current) {
        return;
    }

    let isMounted = true;

    const initializeBook = async () => {
      try {
        setIsLoading(true);

        const ePub = window.ePub;
        const bookInstance = ePub(bookData.epubData);
        bookRef.current = bookInstance;
        
        if (viewerRef.current) {
          viewerRef.current.innerHTML = '';
          viewerRef.current.style.opacity = '0';
        }
        
        const renditionInstance = bookInstance.renderTo(viewerRef.current, {
            width: '100%',
            height: '100%',
            flow: settings.flow === 'scrolled' ? 'scrolled-doc' : 'paginated',
            manager: 'default',
            spread: 'auto',
        });
        if (!isMounted) return;
        setRendition(renditionInstance);
        renditionRef.current = renditionInstance;
          
        const nav = await bookInstance.loaded.navigation;
        if (!isMounted) return;
        setToc(nav.toc);
        navigationRef.current = nav;
        setIsNavReady(true);

        renditionInstance.on('relocated', (location: any) => {
          if (!isMounted) return;

          const cfi = location.start.cfi;
          setCurrentCfi(cfi);

          if (cfi) {
            latestCfiRef.current = cfi;
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = window.setTimeout(() => {
              saveLastPositionForBook(bookId, cfi);
            }, 1000);
          }

          if (locationsReadyRef.current && bookRef.current?.locations) {
            const bookLocations = bookRef.current.locations;
            const page = bookLocations.locationFromCfi(location.start.cfi);
            
            if (page > -1) {
              const progress = bookLocations.percentageFromCfi(location.start.cfi);
              setLocationInfo({
                currentPage: page + 1,
                totalPages: bookLocations.length(),
                progress: Math.round((progress || 0) * 100),
              });
            }
          }
          
          if (isAutoPagingRef.current) {
              isAutoPagingRef.current = false;
              startSpeech();
          }
        });
        
        await bookInstance.ready;
        if (!isMounted) return;

        locationsReadyRef.current = false;
        await bookInstance.locations.generate(1600);
        if (!isMounted) return;
        locationsReadyRef.current = true;
        
        if (bookInstance.locations) {
            setLocationInfo(prev => ({ ...prev, totalPages: bookInstance.locations.length(), currentPage: 1 }));
        }

        setBookmarks(getBookmarksForBook(bookId));
        setCitations(getCitationsForBook(bookId));
        speechStartCfiRef.current = getLastSpokenPositionForBook(bookId);
        
        const startLocation = getLastPositionForBook(bookId) || await findFirstChapter(bookInstance);
        
        if (!isMounted) return;
        
        try {
            await renditionInstance.display(startLocation || undefined);
        } catch (e) {
            console.error(`Failed to display start location "${startLocation}". Defaulting to beginning of the book.`, e);
            // If the initial location fails (e.g., bad CFI), just display the book from the start.
            if (isMounted) {
                await renditionInstance.display();
            }
        }
        
        if (!isMounted) return;
        setIsLoading(false);
        
        if (viewerRef.current) {
            viewerRef.current.style.transition = 'opacity 0.3s ease-in';
            viewerRef.current.style.opacity = '1';
        }
      } catch (error) {
        if (isMounted) {
            console.error("Error initializing EPUB:", error);
        }
      }
    };
    
    initializeBook();

    return () => {
        isMounted = false;
        stopSpeech();
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        if (latestCfiRef.current) {
            saveLastPositionForBook(bookId, latestCfiRef.current);
        }
        locationsReadyRef.current = false;
        setIsNavReady(false);
        navigationRef.current = null;
        if (bookRef.current) {
          bookRef.current.destroy();
          bookRef.current = null;
        }
        renditionRef.current = null;
        setRendition(null);
    };
  }, [bookId, bookData, settings.flow, animationState, startSpeech, stopSpeech]);

  useEffect(() => {
    if (rendition) {
        if (!(rendition as any).themesRegistered) {
            const lightTheme = { body: { 'color': '#000', 'background': '#fff' } };
            const darkTheme = { body: { 'color': '#fff', 'background': '#1f2937' } };
            rendition.themes.register('light', lightTheme);
            rendition.themes.register('dark', darkTheme);
            (rendition as any).themesRegistered = true;
        }

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
    saveReaderSettings(settings);
  }, [rendition, settings]);

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

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

  const nextPage = useCallback(() => { rendition?.next(); setControlsVisible(true); stopSpeech(); }, [rendition, stopSpeech]);
  const prevPage = useCallback(() => { rendition?.prev(); setControlsVisible(true); stopSpeech(); }, [rendition, stopSpeech]);
  
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

  const handleSettingsChange = (newSettings: Partial<ReaderSettings>) => {
    setSettings(prev => {
        const updated = { ...prev, ...newSettings };
        if(newSettings.readAloud) {
            updated.readAloud = { ...prev.readAloud, ...newSettings.readAloud };
        }
        return updated;
    });
  };
  const handleTocNavigate = (href: string) => { stopSpeech(); rendition?.display(href); setShowNavPanel(false); };
  const handleBookmarkNavigate = (cfi: string) => { stopSpeech(); rendition?.display(cfi); setShowNavPanel(false); };
  const handleCitationNavigate = (cfi: string) => { stopSpeech(); rendition?.display(cfi); setShowNavPanel(false); };

  const handleSaveBookmark = useCallback(async (description: string) => {
    if (!latestCfiRef.current) return;

    const cfi = latestCfiRef.current;
    let chapter = currentChapterLabel;

    if (navigationRef.current) {
      try {
        const tocItemPromise = navigationRef.current.get(cfi);
        if (tocItemPromise && typeof tocItemPromise.then === 'function') {
            const tocItem = await tocItemPromise;
            if (tocItem?.label) {
              chapter = tocItem.label.trim();
            }
        }
      } catch (e) {
        console.warn("Could not fetch chapter for bookmark, using last known chapter.", e);
      }
    }
    
    const newBookmark: Bookmark = {
        id: new Date().toISOString(),
        cfi: cfi,
        label: `Page ${locationInfo.currentPage} (${locationInfo.progress}%)`,
        chapter: chapter,
        description: description || undefined,
        createdAt: Date.now(),
    };
    const updatedBookmarks = [...bookmarks, newBookmark];
    setBookmarks(updatedBookmarks);
    saveBookmarksForBook(bookId, updatedBookmarks);
    setShowBookmarkModal(false);
  }, [bookId, bookmarks, locationInfo.currentPage, locationInfo.progress, currentChapterLabel]);


  const deleteBookmark = useCallback((bookmarkId: string) => {
      const updatedBookmarks = bookmarks.filter(b => b.id !== bookmarkId);
      setBookmarks(updatedBookmarks);
      saveBookmarksForBook(bookId, updatedBookmarks);
  }, [bookId, bookmarks]);

  const handleSaveCitation = useCallback(async (note: string) => {
    if (!latestCfiRef.current) return;
    
    const cfi = latestCfiRef.current;
    let chapter = currentChapterLabel;

    if (navigationRef.current) {
      try {
        const tocItemPromise = navigationRef.current.get(cfi);
        if (tocItemPromise && typeof tocItemPromise.then === 'function') {
            const tocItem = await tocItemPromise;
            if (tocItem?.label) {
              chapter = tocItem.label.trim();
            }
        }
      } catch (e) {
        console.warn("Could not fetch chapter for citation, using last known chapter.", e);
      }
    }

    const newCitation: Citation = {
        id: new Date().toISOString(),
        cfi: cfi,
        note: note,
        createdAt: Date.now(),
        pageNumber: locationInfo.currentPage > 0 ? locationInfo.currentPage : undefined,
        chapter: chapter,
    };
    const updatedCitations = [...citations, newCitation];
    setCitations(updatedCitations);
    saveCitationsForBook(bookId, updatedCitations);
    setShowCitationModal(false);
  }, [bookId, citations, locationInfo.currentPage, currentChapterLabel]);

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
        setShowBookmarkModal(true);
    }
  }, [isCurrentPageBookmarked, deleteBookmark, bookmarks, currentCfi]);

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
        setIsSearching(true);
        const results = await performBookSearch(bookRef.current, query);
        setSearchResults(results);
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
    
    debounceTimeoutRef.current = window.setTimeout(() => {
      performSearch(query);
    }, 500);
  }, [performSearch]);

  const handleNavigateToResult = useCallback((cfi: string) => {
    if (!rendition) return;
  
    if (currentHighlightCfi) {
      rendition.annotations.remove(currentHighlightCfi, 'highlight');
    }
    
    stopSpeech();
    setShowSearch(false);
  
    rendition.display(cfi).then(() => {
      rendition.annotations.add('highlight', cfi, {}, undefined, 'hl', { 'fill': 'yellow', 'fill-opacity': '0.3' });
      setCurrentHighlightCfi(cfi);
    });
  }, [rendition, currentHighlightCfi, stopSpeech]);

  const handleCloseSearch = () => {
    setShowSearch(false);
    if (currentHighlightCfi && rendition) {
        rendition.annotations.remove(currentHighlightCfi, 'highlight');
        setCurrentHighlightCfi(null);
    }
  };
  
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (rendition && bookRef.current?.locations && locationsReadyRef.current) {
      setControlsVisible(true);
      stopSpeech();
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

  const toggleSpeech = () => {
    if (speechStateRef.current === 'playing') {
      setSpeechState('paused');
      window.speechSynthesis.pause();
      saveLastSpokenPosition();
      isAutoPagingRef.current = false;
    } else if (speechStateRef.current === 'paused') {
      setSpeechState('playing');
      window.speechSynthesis.resume();
    } else {
      startSpeech();
    }
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
          className={`flex flex-wrap sm:flex-nowrap items-center justify-between sm:justify-start sm:gap-4 p-2 bg-slate-800 shadow-md z-20 text-white flex-shrink-0 transition-transform duration-300 ease-in-out ${controlsVisible ? 'translate-y-0' : '-translate-y-full'}`}
          onMouseEnter={clearControlsTimeout}
          onMouseLeave={resetControlsTimeout}
        >
          {/* Left controls */}
          <div className="flex items-center gap-2 sm:order-1">
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
          
          {/* Right controls */}
          <div className="flex justify-end items-center gap-2 sm:order-3">
              <button onClick={toggleSpeech} className="p-2 rounded-full hover:bg-slate-700 transition-colors" aria-label={speechState === 'playing' ? "Pause Read Aloud" : "Start Read Aloud"}>
                {speechState === 'playing' ? <PauseIcon className="w-6 h-6 text-sky-400" /> : <PlayIcon className="w-6 h-6" />}
              </button>
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

          {/* Title/Author - Placed last in DOM for flexbox ordering */}
          <div className="text-center truncate px-2 w-full pt-2 sm:order-2 sm:w-auto sm:flex-grow sm:min-w-0 sm:pt-0">
              <h2 className="text-lg font-bold">{bookData?.title || 'Loading...'}</h2>
              <p className="text-sm text-slate-400">{bookData?.author}</p>
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
                    disabled={!locationsReadyRef.current || locationInfo.totalPages === 0}
                />
                <div className="text-center text-sm text-slate-300 mt-2" aria-live="polite">
                    {locationInfo.totalPages > 0 && locationsReadyRef.current ? (
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
        <BookmarkModal
          isOpen={showBookmarkModal}
          onClose={() => setShowBookmarkModal(false)}
          onSave={handleSaveBookmark}
        />
      </div>
    </>
  );
};

export default ReaderView;