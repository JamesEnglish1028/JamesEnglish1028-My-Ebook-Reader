/**
 * Barrel export for all services.
 * Centralizes service imports for cleaner code.
 *
 * @example
 * // Before:
 * import { db } from './services/db';
 * import { logger } from './services/logger';
 * import { parseOpds1Xml } from './services/opds';
 *
 * // After:
 * import { db, logger, parseOpds1Xml } from './services';
 */

// Database service
export { db } from './db';

// Logger service
export { logger } from './logger';

// OPDS services
export {
    fetchCatalogContent, filterBooksByAudience, filterBooksByFiction, filterBooksByMedia, getAvailableAudiences, getAvailableCategories, getAvailableCollections, getAvailableFictionModes, getAvailableMediaModes, getFormatFromMimeType,
    groupBooksByMode, parseOpds1Xml,
} from './opds';

// OPDS 2 specific services
export {
    borrowOpds2Work, deleteOpdsCredential, fetchOpds2Feed, findCredentialForUrl, getCachedEtag, getStoredOpdsCredentials, parseOpds2Json, resolveAcquisitionChain, saveOpdsCredential, setCachedEtag,
} from './opds2';

// Credentials service
export {
    deleteCredential, findCredential, getAllCredentials,
    migrateFromLocalStorage, saveCredential,
} from './credentials';

// Google Drive sync services
export {
    downloadLibraryFromDrive, uploadLibraryToDrive,
} from './google';

// Utility functions
export {
    blobUrlToBase64, generatePdfCover, imageUrlToBase64, maybeProxyForCors, proxiedUrl,
} from './utils';

// Reader utilities
export {
    buildTocFromSpine, findFirstChapter, getBookmarksForBook, getCitationsForBook, getEpubViewStateForBook, getLastPositionForBook, getLastSpokenPositionForBook, getPdfViewStateForBook, getReaderSettings, getStorageKey, performBookSearch, saveBookmarksForBook, saveCitationsForBook, saveEpubViewStateForBook, saveLastPositionForBook, saveLastSpokenPositionForBook, savePdfViewStateForBook, saveReaderSettings,
} from './readerUtils';

