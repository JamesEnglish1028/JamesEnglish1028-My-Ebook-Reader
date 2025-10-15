import { useMutation } from '@tanstack/react-query';
import { useLocalStorage } from './useLocalStorage';
import { LIBRARY_KEYS } from '../constants';
import { logger } from '../services/logger';
import type { Catalog, CatalogRegistry } from '../types';

/**
 * Query keys for catalog operations
 */
export const catalogManagementKeys = {
  all: ['catalogs'] as const,
  registries: ['registries'] as const,
};

/**
 * React Query mutation hooks for catalog management operations
 * 
 * Note: These mutations use localStorage directly via useLocalStorage hook
 * since catalogs are stored locally, not in a backend API. The mutations
 * provide a consistent interface and handle error logging.
 */

/**
 * Hook for adding a new catalog
 * 
 * @returns Mutation hook for adding catalogs
 * 
 * @example
 * ```tsx
 * const { mutate: addCatalog, isPending } = useAddCatalog();
 * 
 * addCatalog(
 *   { name: 'Project Gutenberg', url: 'https://...', opdsVersion: 'auto' },
 *   {
 *     onSuccess: (newCatalog) => {
 *       console.log('Catalog added:', newCatalog);
 *     }
 *   }
 * );
 * ```
 */
export function useAddCatalog() {
  const [catalogs, setCatalogs] = useLocalStorage<Catalog[]>(LIBRARY_KEYS.CATALOGS, []);

  return useMutation({
    mutationFn: async ({ name, url, opdsVersion = 'auto' }: { name: string; url: string; opdsVersion?: 'auto' | '1' | '2' }) => {
      const newCatalog: Catalog = {
        id: new Date().toISOString(),
        name,
        url,
        opdsVersion,
      };
      
      setCatalogs(prev => [...prev, newCatalog]);
      logger.info('Catalog added:', newCatalog);
      
      return newCatalog;
    },
    onError: (error) => {
      logger.error('Failed to add catalog:', error);
    },
  });
}

/**
 * Hook for updating an existing catalog
 * 
 * @returns Mutation hook for updating catalogs
 * 
 * @example
 * ```tsx
 * const { mutate: updateCatalog } = useUpdateCatalog();
 * 
 * updateCatalog(
 *   { id: 'catalog-123', updates: { name: 'New Name' } },
 *   {
 *     onSuccess: (updatedCatalog) => {
 *       console.log('Catalog updated:', updatedCatalog);
 *     }
 *   }
 * );
 * ```
 */
export function useUpdateCatalogMutation() {
  const [catalogs, setCatalogs] = useLocalStorage<Catalog[]>(LIBRARY_KEYS.CATALOGS, []);

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Omit<Catalog, 'id'>> }) => {
      let updatedCatalog: Catalog | undefined;
      
      setCatalogs(prev =>
        prev.map(c => {
          if (c.id === id) {
            updatedCatalog = { ...c, ...updates };
            return updatedCatalog;
          }
          return c;
        })
      );
      
      if (!updatedCatalog) {
        throw new Error(`Catalog with id ${id} not found`);
      }
      
      logger.info('Catalog updated:', updatedCatalog);
      return updatedCatalog;
    },
    onError: (error) => {
      logger.error('Failed to update catalog:', error);
    },
  });
}

/**
 * Hook for deleting a catalog
 * 
 * @returns Mutation hook for deleting catalogs
 * 
 * @example
 * ```tsx
 * const { mutate: deleteCatalog } = useDeleteCatalogMutation();
 * 
 * deleteCatalog(
 *   'catalog-123',
 *   {
 *     onSuccess: () => {
 *       console.log('Catalog deleted');
 *     }
 *   }
 * );
 * ```
 */
export function useDeleteCatalogMutation() {
  const [catalogs, setCatalogs] = useLocalStorage<Catalog[]>(LIBRARY_KEYS.CATALOGS, []);

  return useMutation({
    mutationFn: async (id: string) => {
      const catalog = catalogs.find(c => c.id === id);
      if (!catalog) {
        throw new Error(`Catalog with id ${id} not found`);
      }
      
      setCatalogs(prev => prev.filter(c => c.id !== id));
      logger.info('Catalog deleted:', catalog);
      
      return catalog;
    },
    onError: (error) => {
      logger.error('Failed to delete catalog:', error);
    },
  });
}

/**
 * Hook for adding a new catalog registry
 * 
 * @returns Mutation hook for adding registries
 * 
 * @example
 * ```tsx
 * const { mutate: addRegistry } = useAddRegistry();
 * 
 * addRegistry(
 *   { name: 'OPDS Registry', url: 'https://...' },
 *   {
 *     onSuccess: (newRegistry) => {
 *       console.log('Registry added:', newRegistry);
 *     }
 *   }
 * );
 * ```
 */
export function useAddRegistry() {
  const [registries, setRegistries] = useLocalStorage<CatalogRegistry[]>(LIBRARY_KEYS.REGISTRIES, []);

  return useMutation({
    mutationFn: async ({ name, url }: { name: string; url: string }) => {
      const newRegistry: CatalogRegistry = {
        id: new Date().toISOString(),
        name,
        url,
      };
      
      setRegistries(prev => [...prev, newRegistry]);
      logger.info('Registry added:', newRegistry);
      
      return newRegistry;
    },
    onError: (error) => {
      logger.error('Failed to add registry:', error);
    },
  });
}

/**
 * Hook for updating an existing registry
 * 
 * @returns Mutation hook for updating registries
 * 
 * @example
 * ```tsx
 * const { mutate: updateRegistry } = useUpdateRegistryMutation();
 * 
 * updateRegistry(
 *   { id: 'registry-123', updates: { name: 'New Name' } },
 *   {
 *     onSuccess: (updatedRegistry) => {
 *       console.log('Registry updated:', updatedRegistry);
 *     }
 *   }
 * );
 * ```
 */
export function useUpdateRegistryMutation() {
  const [registries, setRegistries] = useLocalStorage<CatalogRegistry[]>(LIBRARY_KEYS.REGISTRIES, []);

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Omit<CatalogRegistry, 'id'>> }) => {
      let updatedRegistry: CatalogRegistry | undefined;
      
      setRegistries(prev =>
        prev.map(r => {
          if (r.id === id) {
            updatedRegistry = { ...r, ...updates };
            return updatedRegistry;
          }
          return r;
        })
      );
      
      if (!updatedRegistry) {
        throw new Error(`Registry with id ${id} not found`);
      }
      
      logger.info('Registry updated:', updatedRegistry);
      return updatedRegistry;
    },
    onError: (error) => {
      logger.error('Failed to update registry:', error);
    },
  });
}

/**
 * Hook for deleting a registry
 * 
 * @returns Mutation hook for deleting registries
 * 
 * @example
 * ```tsx
 * const { mutate: deleteRegistry } = useDeleteRegistryMutation();
 * 
 * deleteRegistry(
 *   'registry-123',
 *   {
 *     onSuccess: () => {
 *       console.log('Registry deleted');
 *     }
 *   }
 * );
 * ```
 */
export function useDeleteRegistryMutation() {
  const [registries, setRegistries] = useLocalStorage<CatalogRegistry[]>(LIBRARY_KEYS.REGISTRIES, []);

  return useMutation({
    mutationFn: async (id: string) => {
      const registry = registries.find(r => r.id === id);
      if (!registry) {
        throw new Error(`Registry with id ${id} not found`);
      }
      
      setRegistries(prev => prev.filter(r => r.id !== id));
      logger.info('Registry deleted:', registry);
      
      return registry;
    },
    onError: (error) => {
      logger.error('Failed to delete registry:', error);
    },
  });
}
