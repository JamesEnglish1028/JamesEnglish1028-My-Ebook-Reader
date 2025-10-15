/**
 * Custom hooks for MeBooks application.
 * These hooks encapsulate reusable logic and state management patterns.
 */

// Local storage and data management
export { useCatalogs } from './useCatalogs';
export { getFromStorage, saveToStorage, useLocalStorage } from './useLocalStorage';
export { SORT_OPTIONS, useSortedBooks } from './useSortedBooks';
export type { SortOrder } from './useSortedBooks';

// React Query hooks for async data
export { 
  useBooks, 
  useBookMetadata, 
  useDeleteBook, 
  useUpdateBook,
  bookKeys 
} from './useBooks';

export {
  useCatalogContent,
  useCatalogRootCollections,
  catalogKeys
} from './useCatalogContent';

// Catalog management mutations
export {
  useAddCatalog,
  useUpdateCatalogMutation,
  useDeleteCatalogMutation,
  useAddRegistry,
  useUpdateRegistryMutation,
  useDeleteRegistryMutation,
  catalogManagementKeys
} from './useCatalogMutations';

// Accessibility hooks
export { useKeyboardNavigation, useGridNavigation } from './useKeyboardNavigation';
export type { KeyboardNavigationOptions, GridNavigationOptions } from './useKeyboardNavigation';

export { useFocusTrap, useFocusManagement } from './useFocusTrap';
export type { FocusTrapOptions } from './useFocusTrap';

export { useGlobalShortcuts, registerShortcut, unregisterShortcut, getShortcutsByCategory, formatShortcut, shortcutRegistry } from './useGlobalShortcuts';
export type { ShortcutAction, GlobalShortcutsOptions } from './useGlobalShortcuts';

