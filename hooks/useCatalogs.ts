import { useCallback, useEffect } from 'react';

import { LIBRARY_KEYS } from '../constants';
import type { Catalog, CatalogRegistry } from '../types';

import { useLocalStorage } from './useLocalStorage';

/**
 * Custom hook for managing OPDS catalogs and registries.
 * Provides CRUD operations for catalogs with localStorage persistence.
 *
 * @returns Object with catalog state and management functions
 *
 * @example
 * const { catalogs, addCatalog, deleteCatalog, updateCatalog } = useCatalogs();
 */
export function useCatalogs() {
    const [catalogs, setCatalogs] = useLocalStorage<Catalog[]>(LIBRARY_KEYS.CATALOGS, []);
    const [registries, setRegistries] = useLocalStorage<CatalogRegistry[]>(LIBRARY_KEYS.REGISTRIES, []);

    // Migrate old catalogs without opdsVersion to include 'auto' as default
    useEffect(() => {
        const needsMigration = catalogs.some((c: any) => !c.opdsVersion);
        if (needsMigration) {
            const migrated = catalogs.map((c: any) =>
                c.opdsVersion ? c : { ...c, opdsVersion: 'auto' as const },
            );
            setCatalogs(migrated);
        }
    }, [catalogs, setCatalogs]);

    // Catalog management functions
    const addCatalog = useCallback((name: string, url: string, opdsVersion: 'auto' | '1' | '2' = 'auto') => {
        const newCatalog: Catalog = {
            id: new Date().toISOString(),
            name,
            url,
            opdsVersion,
        };
        setCatalogs(prev => [...prev, newCatalog]);
        return newCatalog;
    }, [setCatalogs]);

    const deleteCatalog = useCallback((id: string) => {
        setCatalogs(prev => prev.filter(c => c.id !== id));
    }, [setCatalogs]);

    const updateCatalog = useCallback((id: string, updates: Partial<Omit<Catalog, 'id'>>) => {
        setCatalogs(prev =>
            prev.map(c => c.id === id ? { ...c, ...updates } : c),
        );
    }, [setCatalogs]);

    // Registry management functions
    const addRegistry = useCallback((name: string, url: string) => {
        const newRegistry: CatalogRegistry = {
            id: new Date().toISOString(),
            name,
            url,
        };
        setRegistries(prev => [...prev, newRegistry]);
        return newRegistry;
    }, [setRegistries]);

    const deleteRegistry = useCallback((id: string) => {
        setRegistries(prev => prev.filter(r => r.id !== id));
    }, [setRegistries]);

    const updateRegistry = useCallback((id: string, updates: Partial<Omit<CatalogRegistry, 'id'>>) => {
        setRegistries(prev =>
            prev.map(r => r.id === id ? { ...r, ...updates } : r),
        );
    }, [setRegistries]);

    return {
        catalogs,
        registries,
        addCatalog,
        deleteCatalog,
        updateCatalog,
        addRegistry,
        deleteRegistry,
        updateRegistry,
    };
}
