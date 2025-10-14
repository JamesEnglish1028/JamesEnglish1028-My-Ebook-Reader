/**
 * Database Constants
 *
 * IndexedDB configuration and constants.
 * Centralizes all database-related magic values.
 */

/**
 * IndexedDB database name
 */
export const DB_NAME = 'EbookReaderDB' as const;

/**
 * Object store name for books
 */
export const STORE_NAME = 'books' as const;

/**
 * Current database version
 * Increment this when making schema changes
 */
export const DB_VERSION = 3;

/**
 * Index names used in the books object store
 */
export const DB_INDEXES = {
    /** Index on book title */
    TITLE: 'title',
    /** Index on ISBN (legacy, kept for backward compatibility) */
    ISBN: 'isbn',
    /** Index on provider ID (current standard) */
    PROVIDER_ID: 'providerId',
} as const;

/**
 * Database configuration object
 */
export const DB_CONFIG = {
    name: DB_NAME,
    version: DB_VERSION,
    storeName: STORE_NAME,
    indexes: DB_INDEXES,
} as const;
