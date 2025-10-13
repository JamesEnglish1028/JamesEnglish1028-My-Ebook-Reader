

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
  distributor?: string; // Distribution provider name (e.g., OAPEN, BiblioBoard, OverDrive)
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
  distributor?: string; // Distribution provider name (e.g., OAPEN, BiblioBoard, OverDrive)
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
  // 'auto' means let the client probe/guess; '1' forces OPDS 1 (Atom/XML); '2' forces OPDS 2 (JSON)
  opdsVersion?: 'auto' | '1' | '2';
}

export interface CatalogRegistry {
  id: string;
  name: string;
  url: string;
}

export interface Collection {
  title: string;
  href: string;
  description?: string;
}

export interface Series {
  name: string;
  position?: number;
}

export interface Category {
  scheme: string;
  term: string;
  label: string;
}

export interface CategoryLane {
  category: Category;
  books: CatalogBook[];
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
  distributor?: string; // Distribution provider name (e.g., OAPEN, BiblioBoard, OverDrive)
  subjects?: string[];
  format?: 'EPUB' | 'PDF' | string;
  // Raw acquisition media type from the catalog/link (e.g. application/pdf+lcp, application/adobe+epub)
  acquisitionMediaType?: string;
  // Media type from schema:additionalType (e.g. http://schema.org/EBook, http://bib.schema.org/Audiobook)
  mediaType?: string;
  // OPDS 1: Navigation links to collection feeds (rel="collection")
  collections?: Collection[];
  // OPDS 2: Series membership metadata (belongsTo)
  series?: Series;
  // Category information for Palace.io OPDS1 feeds  
  categories?: Category[];
}

export interface CatalogNavigationLink {
  title: string;
  url: string;
  rel: string;
  isCatalog?: boolean;
  // For tree view state
  isExpanded?: boolean;
  isLoading?: boolean;
  children?: CatalogNavigationLink[];
  // New properties for enhanced UX
  _hasFetchedChildren?: boolean;
  _canExpand?: boolean;
}

export interface CatalogPagination {
  next?: string;
  prev?: string;
  first?: string;
  last?: string;
}

export type CategorizationMode = 'subject' | 'flat';

export type AudienceMode = 'all' | 'adult' | 'young-adult' | 'children';

export type FictionMode = 'all' | 'fiction' | 'non-fiction';

export type MediaMode = 'all' | 'ebook' | 'audiobook';

export type CollectionMode = 'all' | string; // 'all' or specific collection name

export interface CollectionGroup {
  collection: Collection;
  books: CatalogBook[];
}

export interface CatalogWithCollections {
  books: CatalogBook[];
  navLinks: CatalogNavigationLink[];
  pagination: CatalogPagination;
  collections: CollectionGroup[];
  uncategorizedBooks: CatalogBook[];
}

export interface CatalogWithCategories {
  books: CatalogBook[];
  navLinks: CatalogNavigationLink[];
  pagination: CatalogPagination;
  categoryLanes: CategoryLane[];
  collectionLinks: Collection[];
  uncategorizedBooks: CatalogBook[];
}

export interface GoogleUser {
  name: string;
  email: string;
  picture: string;
}

// Authentication document structure from OPDS servers
export interface AuthDocument {
  type?: string;
  title?: string;
  description?: string;
  links?: Array<{
    rel?: string;
    href?: string;
    type?: string;
  }>;
  authentication?: Array<{
    type?: string;
    description?: string;
    inputs?: Record<string, unknown>;
  }>;
}

// Credential prompt state interface
export interface CredentialPrompt {
  isOpen: boolean;
  host: string | null;
  pendingHref?: string | null;
  pendingBook?: CatalogBook | null;
  pendingCatalogName?: string;
  authDocument?: AuthDocument | null;
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