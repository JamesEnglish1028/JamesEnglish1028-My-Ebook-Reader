/**
 * Type Safety Improvements for Book Import Process
 *
 * This file contains branded types, discriminated unions, and type guards
 * to improve type safety and error handling throughout the book import flow.
 *
 * Key improvements:
 * 1. Branded types for IDs prevent mixing different ID types
 * 2. Discriminated unions for import results enable exhaustive checking
 * 3. Type guards provide runtime type narrowing
 * 4. Import state machine types ensure valid state transitions
 */

// ============================================================================
// BRANDED TYPES FOR IDs
// ============================================================================
// These prevent accidentally mixing different types of IDs (e.g., using a
// catalog ID where a book ID is expected)

/**
 * Unique identifier for a book in the local library (IndexedDB)
 */
export type BookId = number & { readonly __brand: 'BookId' };

/**
 * Unique identifier for an OPDS catalog
 */
export type CatalogId = string & { readonly __brand: 'CatalogId' };

/**
 * Unique identifier from a book provider/distributor (e.g., ISBN, OPDS ID)
 */
export type ProviderId = string & { readonly __brand: 'ProviderId' };

/**
 * Helper to create a branded BookId from a number
 */
export function toBookId(id: number): BookId {
    return id as BookId;
}

/**
 * Helper to create a branded CatalogId from a string
 */
export function toCatalogId(id: string): CatalogId {
    return id as CatalogId;
}

/**
 * Helper to create a branded ProviderId from a string
 */
export function toProviderId(id: string): ProviderId {
    return id as ProviderId;
}

// ============================================================================
// IMPORT RESULT TYPES (Discriminated Unions)
// ============================================================================
// These use a discriminator field ('kind') to enable exhaustive type checking
// and ensure all possible outcomes are handled

/**
 * Import was successful - book is now in the library
 */
export interface ImportSuccess {
    kind: 'success';
    bookId: BookId;
    title: string;
    message?: string;
}

/**
 * Import failed due to an error
 */
export interface ImportError {
    kind: 'error';
    error: string;
    errorType?: 'network' | 'parse' | 'storage' | 'auth' | 'format' | 'unknown';
    retryable: boolean;
    details?: unknown;
}

/**
 * Import detected a duplicate - user must choose to replace or keep both
 */
export interface ImportDuplicate {
    kind: 'duplicate';
    newBook: import('../types').BookRecord;
    existingBook: import('../types').BookRecord;
    message: string;
}

/**
 * Import requires authentication before proceeding
 */
export interface ImportAuthRequired {
    kind: 'auth-required';
    host: string;
    downloadUrl: string;
    book: import('../types').CatalogBook;
    catalogName?: string;
    authDocument?: import('../types').AuthDocument;
    message: string;
}

/**
 * Import was cancelled by the user
 */
export interface ImportCancelled {
    kind: 'cancelled';
    reason?: string;
}

/**
 * Union type of all possible import results
 * Use this as the return type for import functions
 */
export type ImportResult =
    | ImportSuccess
    | ImportError
    | ImportDuplicate
    | ImportAuthRequired
    | ImportCancelled;

// ============================================================================
// IMPORT STATUS TYPES (State Machine)
// ============================================================================
// These represent the different states during the import process

/**
 * No import is in progress
 */
export interface ImportStatusIdle {
    state: 'idle';
}

/**
 * Downloading book from remote source
 */
export interface ImportStatusFetching {
    state: 'fetching';
    progress?: number; // 0-100 percentage
    message: string; // e.g., "Downloading War and Peace..."
}

/**
 * Parsing book metadata (EPUB/PDF)
 */
export interface ImportStatusParsing {
    state: 'parsing';
    message: string; // e.g., "Parsing EPUB..."
}

/**
 * Extracting cover image
 */
export interface ImportStatusExtracting {
    state: 'extracting';
    message: string; // e.g., "Extracting cover..."
}

/**
 * Checking for duplicates in library
 */
export interface ImportStatusChecking {
    state: 'checking';
    message: string; // e.g., "Checking for duplicates..."
}

/**
 * Saving book to IndexedDB
 */
export interface ImportStatusSaving {
    state: 'saving';
    message: string; // e.g., "Saving to library..."
}

/**
 * Import completed successfully
 */
export interface ImportStatusSuccess {
    state: 'success';
    message: string; // e.g., "Import successful!"
    bookId: BookId;
}

/**
 * Import failed with error
 */
export interface ImportStatusError {
    state: 'error';
    error: string;
    retryable: boolean;
}

/**
 * Waiting for user to resolve duplicate
 */
export interface ImportStatusAwaitingDuplicate {
    state: 'awaiting-duplicate';
    message: string; // e.g., "This book already exists in your library"
}

/**
 * Waiting for user to provide credentials
 */
export interface ImportStatusAwaitingAuth {
    state: 'awaiting-auth';
    message: string; // e.g., "Authentication required"
    host: string;
}

/**
 * Union type of all possible import states
 */
export type ImportStatus =
    | ImportStatusIdle
    | ImportStatusFetching
    | ImportStatusParsing
    | ImportStatusExtracting
    | ImportStatusChecking
    | ImportStatusSaving
    | ImportStatusSuccess
    | ImportStatusError
    | ImportStatusAwaitingDuplicate
    | ImportStatusAwaitingAuth;

// ============================================================================
// TYPE GUARDS
// ============================================================================
// These provide runtime type narrowing for discriminated unions

/**
 * Type guard: Check if import result is success
 */
export function isImportSuccess(result: ImportResult): result is ImportSuccess {
    return result.kind === 'success';
}

/**
 * Type guard: Check if import result is error
 */
export function isImportError(result: ImportResult): result is ImportError {
    return result.kind === 'error';
}

/**
 * Type guard: Check if import result is duplicate
 */
export function isImportDuplicate(result: ImportResult): result is ImportDuplicate {
    return result.kind === 'duplicate';
}

/**
 * Type guard: Check if import result requires auth
 */
export function isImportAuthRequired(result: ImportResult): result is ImportAuthRequired {
    return result.kind === 'auth-required';
}

/**
 * Type guard: Check if import result is cancelled
 */
export function isImportCancelled(result: ImportResult): result is ImportCancelled {
    return result.kind === 'cancelled';
}

/**
 * Type guard: Check if import status is idle
 */
export function isImportIdle(status: ImportStatus): status is ImportStatusIdle {
    return status.state === 'idle';
}

/**
 * Type guard: Check if import status is in progress (any active state)
 */
export function isImportInProgress(status: ImportStatus): boolean {
    return ['fetching', 'parsing', 'extracting', 'checking', 'saving'].includes(status.state);
}

/**
 * Type guard: Check if import status is success
 */
export function isImportSuccessStatus(status: ImportStatus): status is ImportStatusSuccess {
    return status.state === 'success';
}

/**
 * Type guard: Check if import status is error
 */
export function isImportErrorStatus(status: ImportStatus): status is ImportStatusError {
    return status.state === 'error';
}

/**
 * Type guard: Check if import status is awaiting user action
 */
export function isImportAwaiting(status: ImportStatus): boolean {
    return ['awaiting-duplicate', 'awaiting-auth'].includes(status.state);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create an ImportSuccess result
 */
export function createImportSuccess(bookId: BookId, title: string, message?: string): ImportSuccess {
    return {
        kind: 'success',
        bookId,
        title,
        message: message || 'Import successful!',
    };
}

/**
 * Create an ImportError result
 */
export function createImportError(
    error: string,
    options?: {
        errorType?: ImportError['errorType'];
        retryable?: boolean;
        details?: unknown;
    },
): ImportError {
    return {
        kind: 'error',
        error,
        errorType: options?.errorType || 'unknown',
        retryable: options?.retryable ?? false,
        details: options?.details,
    };
}

/**
 * Create an ImportDuplicate result
 */
export function createImportDuplicate(
    newBook: import('../types').BookRecord,
    existingBook: import('../types').BookRecord,
): ImportDuplicate {
    return {
        kind: 'duplicate',
        newBook,
        existingBook,
        message: `A book with the same ${existingBook.isbn ? 'ISBN' : 'provider ID'} already exists in your library.`,
    };
}

/**
 * Create an ImportAuthRequired result
 */
export function createImportAuthRequired(
    host: string,
    downloadUrl: string,
    book: import('../types').CatalogBook,
    catalogName?: string,
    authDocument?: import('../types').AuthDocument,
): ImportAuthRequired {
    return {
        kind: 'auth-required',
        host,
        downloadUrl,
        book,
        catalogName,
        authDocument,
        message: 'Authentication required to download this book.',
    };
}

/**
 * Create an ImportCancelled result
 */
export function createImportCancelled(reason?: string): ImportCancelled {
    return {
        kind: 'cancelled',
        reason,
    };
}

/**
 * Create an ImportStatus (Idle)
 */
export function createIdleStatus(): ImportStatusIdle {
    return { state: 'idle' };
}

/**
 * Create an ImportStatus (Fetching)
 */
export function createFetchingStatus(message: string, progress?: number): ImportStatusFetching {
    return { state: 'fetching', message, progress };
}

/**
 * Create an ImportStatus (Parsing)
 */
export function createParsingStatus(message: string): ImportStatusParsing {
    return { state: 'parsing', message };
}

/**
 * Create an ImportStatus (Extracting)
 */
export function createExtractingStatus(message: string): ImportStatusExtracting {
    return { state: 'extracting', message };
}

/**
 * Create an ImportStatus (Checking)
 */
export function createCheckingStatus(message: string): ImportStatusChecking {
    return { state: 'checking', message };
}

/**
 * Create an ImportStatus (Saving)
 */
export function createSavingStatus(message: string): ImportStatusSaving {
    return { state: 'saving', message };
}

/**
 * Create an ImportStatus (Success)
 */
export function createSuccessStatus(message: string, bookId: BookId): ImportStatusSuccess {
    return { state: 'success', message, bookId };
}

/**
 * Create an ImportStatus (Error)
 */
export function createErrorStatus(error: string, retryable: boolean = false): ImportStatusError {
    return { state: 'error', error, retryable };
}

/**
 * Create an ImportStatus (Awaiting Duplicate)
 */
export function createAwaitingDuplicateStatus(message: string): ImportStatusAwaitingDuplicate {
    return { state: 'awaiting-duplicate', message };
}

/**
 * Create an ImportStatus (Awaiting Auth)
 */
export function createAwaitingAuthStatus(message: string, host: string): ImportStatusAwaitingAuth {
    return { state: 'awaiting-auth', message, host };
}

// ============================================================================
// LEGACY COMPATIBILITY
// ============================================================================
// Helpers to convert between old and new status formats

/**
 * Convert old ImportStatus format to new format
 * Old: { isLoading: boolean; message: string; error: string | null }
 */
export function fromLegacyStatus(legacy: {
    isLoading: boolean;
    message: string;
    error: string | null
}): ImportStatus {
    if (legacy.error) {
        return createErrorStatus(legacy.error);
    }
    if (legacy.isLoading && legacy.message) {
        // Try to infer state from message
        const msg = legacy.message.toLowerCase();
        if (msg.includes('download')) return createFetchingStatus(legacy.message);
        if (msg.includes('pars')) return createParsingStatus(legacy.message);
        if (msg.includes('extract') || msg.includes('cover')) return createExtractingStatus(legacy.message);
        if (msg.includes('check') || msg.includes('duplicate')) return createCheckingStatus(legacy.message);
        if (msg.includes('sav')) return createSavingStatus(legacy.message);
        return createFetchingStatus(legacy.message); // Default to fetching
    }
    if (legacy.message && !legacy.isLoading) {
        // Probably success
        return { state: 'success', message: legacy.message, bookId: 0 as BookId };
    }
    return createIdleStatus();
}

/**
 * Convert new ImportStatus format to old format (for gradual migration)
 */
export function toLegacyStatus(status: ImportStatus): {
    isLoading: boolean;
    message: string;
    error: string | null
} {
    if (status.state === 'error') {
        return { isLoading: false, message: '', error: status.error };
    }
    if (isImportInProgress(status)) {
        return { isLoading: true, message: (status as any).message || '', error: null };
    }
    if (status.state === 'success') {
        return { isLoading: false, message: status.message, error: null };
    }
    if (status.state === 'awaiting-duplicate' || status.state === 'awaiting-auth') {
        return { isLoading: false, message: status.message, error: null };
    }
    return { isLoading: false, message: '', error: null };
}
