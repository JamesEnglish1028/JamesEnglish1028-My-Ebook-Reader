

export interface BookRecord {
  id?: number;
  title: string;
  author: string;
  coverImage: string | null; // Base64 encoded image
  epubData: ArrayBuffer;
  publisher?: string;
  publicationDate?: string;
  isbn?: string; // Kept for backwards compatibility with existing library books
  providerId?: string;
  providerName?: string;
  description?: string;
  subjects?: string[];
  format?: 'EPUB' | 'PDF' | string;
}

export interface BookMetadata {
  id: number;
  title: string;
  author: string;
  coverImage: string | null;
  publisher?: string;
  publicationDate?: string;
  isbn?: string; // Kept for backwards compatibility with existing library books
  providerId?: string;
  providerName?: string;
  description?: string;
  subjects?: string[];
  format?: 'EPUB' | 'PDF' | string;
}

export interface ReadAloudSettings {
  voiceURI: string | null;
  rate: number;
  pitch: number;
  volume: number;
}

export interface ReaderSettings {
  fontSize: number;
  theme: 'light' | 'dark';
  flow: 'paginated' | 'scrolled';
  fontFamily: string;
  citationFormat: 'apa' | 'mla' | 'chicago';
  readAloud: ReadAloudSettings;
}

export interface TocItem {
  id: string;
  href: string;
  label: string;
  subitems?: TocItem[];
}

export interface Bookmark {
  id: string;
  cfi: string;
  label: string;
  chapter?: string;
  description?: string;
  createdAt: number;
}

export interface Citation {
  id: string;
  cfi: string;
  note: string;
  createdAt: number;
  pageNumber?: number;
  chapter?: string;
}

export interface SearchResult {
  cfi: string;
  excerpt: string;
}

export interface CoverAnimationData {
  rect: DOMRect;
  coverImage: string | null;
}

export interface Catalog {
  id:string;
  name: string;
  url: string;
}

export interface CatalogBook {
  title: string;
  author: string;
  coverImage: string | null;
  downloadUrl: string;
  summary: string | null;
  publisher?: string;
  publicationDate?: string;
  providerId?: string;
  subjects?: string[];
  format?: 'EPUB' | 'PDF' | string;
}

export interface CatalogNavigationLink {
  title: string;
  url: string;
  rel: string;
  // For tree view state
  isExpanded?: boolean;
  isLoading?: boolean;
  children?: CatalogNavigationLink[];
}

export interface CatalogPagination {
  next?: string;
  prev?: string;
  first?: string;
  last?: string;
}

export interface GoogleUser {
  name: string;
  email: string;
  picture: string;
}

// Structure for the library.json file stored in Google Drive
export interface SyncPayload {
  library: Omit<BookRecord, 'epubData'>[];
  catalogs: Catalog[];
  bookmarks: Record<number, Bookmark[]>;
  citations: Record<number, Citation[]>;
  positions: Record<number, string | null>;
  settings: ReaderSettings;
}