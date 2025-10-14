/**
 * Root Types Module - Backward Compatibility Layer
 * 
 * This file re-exports all types from their respective domain modules.
 * New code should import directly from domain modules for better organization.
 * 
 * @example
 * // Old way (still works)
 * import { BookMetadata, Catalog } from './types';
 * 
 * // New way (preferred)
 * import { BookMetadata } from './domain/book';
 * import { Catalog } from './domain/catalog';
 */

// Re-export import types for convenience
export * from './types/import';

// Re-export all domain types for backward compatibility
export * from './domain/book';
export * from './domain/catalog';
export * from './domain/reader';
export * from './domain/sync';
