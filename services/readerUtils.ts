import { ReaderSettings, Bookmark, Citation, SearchResult } from '../types';

const STORAGE_PREFIX = 'ebook-reader';

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

export const getStorageKey = (type: string, bookId: number | string) => `${STORAGE_PREFIX}-${type}-${bookId}`;

export const getReaderSettings = (): ReaderSettings => {
    const savedSettings = localStorage.getItem(getStorageKey('settings', 'global'));
    const parsedSettings = savedSettings ? JSON.parse(savedSettings) : {};
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
    localStorage.setItem(getStorageKey('settings', 'global'), JSON.stringify(settings));
};

// --- Bookmarks ---
export const getBookmarksForBook = (bookId: number): Bookmark[] => {
    const saved = localStorage.getItem(getStorageKey('bookmarks', bookId));
    return saved ? JSON.parse(saved) : [];
};

export const saveBookmarksForBook = (bookId: number, bookmarks: Bookmark[]) => {
    localStorage.setItem(getStorageKey('bookmarks', bookId), JSON.stringify(bookmarks));
};

// --- Citations ---
export const getCitationsForBook = (bookId: number): Citation[] => {
    const saved = localStorage.getItem(getStorageKey('citations', bookId));
    return saved ? JSON.parse(saved) : [];
};

export const saveCitationsForBook = (bookId: number, citations: Citation[]) => {
    localStorage.setItem(getStorageKey('citations', bookId), JSON.stringify(citations));
};

// --- Position ---
export const getLastPositionForBook = (bookId: number): string | null => {
    return localStorage.getItem(getStorageKey('pos', bookId));
};

export const saveLastPositionForBook = (bookId: number, cfi: string) => {
    localStorage.setItem(getStorageKey('pos', bookId), cfi);
};

// --- Speech Position ---
export const getLastSpokenPositionForBook = (bookId: number): string | null => {
    return localStorage.getItem(getStorageKey('speech-pos', bookId));
};

export const saveLastSpokenPositionForBook = (bookId: number, cfi: string) => {
    localStorage.setItem(getStorageKey('speech-pos', bookId), cfi);
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
        })
    );
    const nestedResults = await Promise.all(searchPromises);
    return [].concat(...nestedResults);
};

export const findFirstChapter = async (book: any): Promise<string | undefined> => {
  if (book.navigation?.landmarks?.length > 0) {
    const bodyMatter = book.navigation.landmarks.find((l: any) => l.type?.includes('bodymatter'));
    if (bodyMatter?.href) return bodyMatter.href;
  }

  if (book.packaging?.guide?.length > 0) {
    const textReference = book.packaging.guide.find((ref: any) => ref.type?.toLowerCase().includes('text'));
    if (textReference?.href) return textReference.href;
  }

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

  return book.spine.items.length > 0 ? book.spine.items[0].href : undefined;
};

// --- PDF viewer state (zoom / fit) ---
export const getPdfViewStateForBook = (bookId: number) => {
  try {
    const saved = localStorage.getItem(getStorageKey('pdfview', bookId));
    return saved ? JSON.parse(saved) : { zoomPercent: 100, fitMode: 'page' };
  } catch (e) {
    console.warn('Failed to read pdf view state', e);
    return { zoomPercent: 100, fitMode: 'page' };
  }
};

export const savePdfViewStateForBook = (bookId: number, state: { zoomPercent: number; fitMode: string }) => {
  try {
    localStorage.setItem(getStorageKey('pdfview', bookId), JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save pdf view state', e);
  }
};

// --- EPUB per-book view state (e.g. font size) ---
export const getEpubViewStateForBook = (bookId: number) => {
  try {
    const saved = localStorage.getItem(getStorageKey('epubview', bookId));
    return saved ? JSON.parse(saved) : {};
  } catch (e) {
    console.warn('Failed to read epub view state', e);
    return {};
  }
};

export const saveEpubViewStateForBook = (bookId: number, state: { fontSize?: number }) => {
  try {
    localStorage.setItem(getStorageKey('epubview', bookId), JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save epub view state', e);
  }
};
