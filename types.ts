export interface BookRecord {
  id?: number;
  title: string;
  author: string;
  coverImage: string | null; // Base64 encoded image
  epubData: ArrayBuffer;
  publisher?: string;
  publicationDate?: string;
  isbn?: string;
}

export interface BookMetadata {
  id: number;
  title: string;
  author: string;
  coverImage: string | null;
  publisher?: string;
  publicationDate?: string;
  isbn?: string;
}

export interface ReaderSettings {
  fontSize: number;
  theme: 'light' | 'dark';
  flow: 'paginated' | 'scrolled';
  fontFamily: string;
  citationFormat: 'apa' | 'mla' | 'chicago';
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