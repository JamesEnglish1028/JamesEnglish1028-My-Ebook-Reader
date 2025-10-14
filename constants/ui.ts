/**
 * UI Constants
 *
 * User interface related constants including themes, sizes, timeouts, etc.
 * Centralizes all UI magic values for consistency and maintainability.
 */

/**
 * Splash screen display duration (milliseconds)
 */
export const SPLASH_DURATION = 2500;

/**
 * Toast/notification display duration (milliseconds)
 */
export const TOAST_DURATION = 3000;

/**
 * Success message display duration (milliseconds)
 */
export const SUCCESS_MESSAGE_DURATION = 2000;

/**
 * Debounce delay for search input (milliseconds)
 */
export const SEARCH_DEBOUNCE_DELAY = 300;

/**
 * Theme options
 */
export const THEMES = {
    LIGHT: 'light',
    DARK: 'dark',
} as const;

/**
 * Reader flow modes
 */
export const FLOW_MODES = {
    PAGINATED: 'paginated',
    SCROLLED: 'scrolled',
} as const;

/**
 * Supported book formats
 */
export const BOOK_FORMATS = {
    EPUB: 'EPUB',
    PDF: 'PDF',
    AUDIOBOOK: 'AUDIOBOOK',
} as const;

/**
 * Citation format options
 */
export const CITATION_FORMATS = {
    APA: 'apa',
    MLA: 'mla',
    CHICAGO: 'chicago',
} as const;

/**
 * OPDS version options
 */
export const OPDS_VERSIONS = {
    AUTO: 'auto',
    V1: '1',
    V2: '2',
} as const;

/**
 * Font family options for reader
 */
export const FONT_FAMILIES = [
    'Georgia, serif',
    'Times New Roman, serif',
    'Arial, sans-serif',
    'Helvetica, sans-serif',
    'Verdana, sans-serif',
    'Courier New, monospace',
] as const;

/**
 * Default reader settings
 */
export const DEFAULT_READER_SETTINGS = {
    fontSize: 18,
    theme: THEMES.LIGHT,
    flow: FLOW_MODES.PAGINATED,
    fontFamily: FONT_FAMILIES[0],
    citationFormat: CITATION_FORMATS.MLA,
    readAloud: {
        voiceURI: null,
        rate: 1,
        pitch: 1,
        volume: 1,
    },
} as const;

/**
 * Font size limits
 */
export const FONT_SIZE = {
    MIN: 12,
    MAX: 32,
    DEFAULT: 18,
    STEP: 2,
} as const;

/**
 * PDF zoom limits
 */
export const PDF_ZOOM = {
    MIN: 50,
    MAX: 300,
    DEFAULT: 100,
    STEP: 10,
} as const;

/**
 * PDF fit modes
 */
export const PDF_FIT_MODES = {
    WIDTH: 'width',
    HEIGHT: 'height',
    PAGE: 'page',
} as const;

/**
 * View types
 */
export const VIEW_TYPES = {
    LIBRARY: 'library',
    READER: 'reader',
    PDF_READER: 'pdfReader',
    BOOK_DETAIL: 'bookDetail',
    ABOUT: 'about',
} as const;

/**
 * Categorization modes for OPDS catalogs
 */
export const CATEGORIZATION_MODES = {
    SUBJECT: 'subject',
    FLAT: 'flat',
} as const;

/**
 * Audience filter modes
 */
export const AUDIENCE_MODES = {
    ALL: 'all',
    ADULT: 'adult',
    YOUNG_ADULT: 'young-adult',
    CHILDREN: 'children',
} as const;

/**
 * Fiction filter modes
 */
export const FICTION_MODES = {
    ALL: 'all',
    FICTION: 'fiction',
    NON_FICTION: 'non-fiction',
} as const;

/**
 * Media filter modes
 */
export const MEDIA_MODES = {
    ALL: 'all',
    EBOOK: 'ebook',
    AUDIOBOOK: 'audiobook',
} as const;

/**
 * HTTP status codes (commonly used)
 */
export const HTTP_STATUS = {
    OK: 200,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    TOO_MANY_REQUESTS: 429,
    SERVER_ERROR: 500,
} as const;

/**
 * Maximum file sizes
 */
export const MAX_FILE_SIZE = {
    /** Maximum EPUB size in bytes (100MB) */
    EPUB: 100 * 1024 * 1024,
    /** Maximum PDF size in bytes (200MB) */
    PDF: 200 * 1024 * 1024,
} as const;

/**
 * Animation durations (milliseconds)
 */
export const ANIMATION_DURATION = {
    FAST: 150,
    NORMAL: 300,
    SLOW: 500,
} as const;

/**
 * Z-index layers for consistent stacking
 */
export const Z_INDEX = {
    MODAL: 50,
    TOAST: 60,
    TOOLTIP: 70,
} as const;
