import { READER_KEYS, getStorageKey as getKey } from '../constants';
import type { Bookmark, Citation, ReaderSettings, SearchResult } from '../types';

const safeParse = <T>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch (e) {
    console.warn('Failed to parse JSON from storage, using fallback', e);
    return fallback;
  }
};

// --- Settings ---
const defaultSettings: ReaderSettings = {
  fontSize: 100,
  theme: 'light',
  flow: 'paginated',
  fontFamily: 'Original',
  citationFormat: 'apa',
  readAloud: {
    voiceURI: null,
    rate: 0.9,
    pitch: 1,
    volume: 1,
  },
};

// Re-export the getStorageKey helper from constants for backward compatibility
export const getStorageKey = getKey;

export const getReaderSettings = (): ReaderSettings => {
  const savedSettings = localStorage.getItem(READER_KEYS.GLOBAL_SETTINGS);
  const parsedSettings = safeParse<Record<string, any>>(savedSettings, {});
  return {
    ...defaultSettings,
    ...parsedSettings,
    readAloud: {
      ...defaultSettings.readAloud,
      ...(parsedSettings.readAloud || {}),
    },
  };
};

export const saveReaderSettings = (settings: ReaderSettings) => {
  localStorage.setItem(READER_KEYS.GLOBAL_SETTINGS, JSON.stringify(settings));
};

// --- Bookmarks ---
export const getBookmarksForBook = (bookId: number): Bookmark[] => {
  const saved = localStorage.getItem(getKey.bookmarks(bookId));
  return safeParse<Bookmark[]>(saved, []);
};

export const saveBookmarksForBook = (bookId: number, bookmarks: Bookmark[]) => {
  localStorage.setItem(getKey.bookmarks(bookId), JSON.stringify(bookmarks));
};

// --- Citations ---
export const getCitationsForBook = (bookId: number): Citation[] => {
  const saved = localStorage.getItem(getKey.citations(bookId));
  return safeParse<Citation[]>(saved, []);
};

export const saveCitationsForBook = (bookId: number, citations: Citation[]) => {
  localStorage.setItem(getKey.citations(bookId), JSON.stringify(citations));
};

// --- Position ---
export const getLastPositionForBook = (bookId: number): string | null => {
  return localStorage.getItem(getKey.position(bookId));
};

export const saveLastPositionForBook = (bookId: number, cfi: string) => {
  localStorage.setItem(getKey.position(bookId), cfi);
};

// --- Speech Position ---
export const getLastSpokenPositionForBook = (bookId: number): string | null => {
  return localStorage.getItem(getKey.spokenPosition(bookId));
};

export const saveLastSpokenPositionForBook = (bookId: number, cfi: string) => {
  localStorage.setItem(getKey.spokenPosition(bookId), cfi);
};

// --- EPUB Interaction Helpers ---

export const performBookSearch = async (book: any, query: string): Promise<SearchResult[]> => {
  if (!query || !book) return [];

  const searchPromises = book.spine.spineItems.map((item: any) =>
    item.load(book.load.bind(book)).then(() => {
      const results = item.find(query.trim());
      item.unload();
      return Promise.resolve(results);
    }).catch(() => {
      item.unload();
      return Promise.resolve([]);
    }),
  );
  const nestedResults = await Promise.all(searchPromises);
  return [].concat(...nestedResults);
};

export const findFirstChapter = async (book: any): Promise<string | undefined> => {
  // Prefer landmarks/bodymatter when available (EPUB3)
  try {
    if (book.navigation && Array.isArray(book.navigation.landmarks) && book.navigation.landmarks.length > 0) {
      const bodyMatter = book.navigation.landmarks.find((l: any) => (l.type || '').toString().toLowerCase().includes('bodymatter'));
      if (bodyMatter && bodyMatter.href) return bodyMatter.href;
    }
  } catch (e) {
    console.warn('Error reading navigation landmarks when finding first chapter', e);
  }

  // EPUB package guide (legacy entry points)
  try {
    if (book.packaging && Array.isArray(book.packaging.guide) && book.packaging.guide.length > 0) {
      const textReference = book.packaging.guide.find((ref: any) => (ref.type || '').toString().toLowerCase().includes('text'));
      if (textReference && textReference.href) return textReference.href;
    }
  } catch (e) {
    console.warn('Error reading packaging guide when finding first chapter', e);
  }

  // Fall back to scanning spine for a content-like section (EPUB2 / missing nav)
  if (book.spine && Array.isArray(book.spine.items)) {
    for (const item of book.spine.items) {
      try {
        // attempt to load the section via epub.js APIs; if unavailable, treat as candidate
        if (book.spine.get) {
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
        } else {
          // If we cannot load, just return the first spine item as last resort
          return item.href;
        }
      } catch (error) {
        console.warn(`Could not parse section ${item.href} when searching for first chapter. Skipping.`, error);
      }
    }
    return book.spine.items.length > 0 ? book.spine.items[0].href : undefined;
  }

  return undefined;
};

// Build a minimal TOC from spine entries when navigation data is missing (useful for EPUB2 / NCX fallbacks)
export const buildTocFromSpine = (book: any): { id: string; href: string; label: string }[] => {
  const toc: { id: string; href: string; label: string }[] = [];
  try {
    if (book && book.spine && Array.isArray(book.spine.items)) {
      for (let i = 0; i < book.spine.items.length; i++) {
        const item = book.spine.items[i];
        const href = item.href || item.idref || `item-${i}`;
        const label = item.id || (item.href ? item.href.split('#')[0].split('/').pop() : `Section ${i + 1}`) || `Section ${i + 1}`;
        toc.push({ id: `${i}`, href, label });
      }
    }
  } catch (e) {
    console.warn('Failed to build fallback TOC from spine', e);
  }
  return toc;
};

// --- PDF viewer state (zoom / fit) ---
export const getPdfViewStateForBook = (bookId: number) => {
  try {
    const saved = localStorage.getItem(getKey.pdfViewState(bookId));
    return safeParse<{ zoomPercent: number; fitMode: string }>(saved, { zoomPercent: 100, fitMode: 'page' });
  } catch (e) {
    console.warn('Failed to read pdf view state', e);
    return { zoomPercent: 100, fitMode: 'page' };
  }
};

export const savePdfViewStateForBook = (bookId: number, state: { zoomPercent: number; fitMode: string }) => {
  try {
    localStorage.setItem(getKey.pdfViewState(bookId), JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save pdf view state', e);
  }
};

// --- EPUB per-book view state (e.g. font size) ---
export const getEpubViewStateForBook = (bookId: number) => {
  try {
    const saved = localStorage.getItem(getKey.epubViewState(bookId));
    return safeParse<Record<string, any>>(saved, {});
  } catch (e) {
    console.warn('Failed to read epub view state', e);
    return {};
  }
};

export const saveEpubViewStateForBook = (bookId: number, state: { fontSize?: number }) => {
  try {
    localStorage.setItem(getKey.epubViewState(bookId), JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save epub view state', e);
  }
};
