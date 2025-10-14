import { useCallback, useEffect, useState } from 'react';

import { logger } from '../services';

/**
 * Custom hook for managing localStorage with type safety and automatic serialization.
 * Provides a React-friendly API similar to useState but persisted to localStorage.
 *
 * @param key - The localStorage key
 * @param defaultValue - Default value if key doesn't exist
 * @returns [value, setValue, removeValue] tuple
 *
 * @example
 * const [catalogs, setCatalogs] = useLocalStorage<Catalog[]>('ebook-catalogs', []);
 */
export function useLocalStorage<T>(key: string, defaultValue: T) {
    // Initialize state from localStorage
    const [value, setValue] = useState<T>(() => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            logger.error(`Error reading localStorage key "${key}":`, error);
            return defaultValue;
        }
    });

    // Update localStorage whenever value changes
    useEffect(() => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            logger.error(`Error writing to localStorage key "${key}":`, error);
        }
    }, [key, value]);

    // Provide a way to remove the item
    const removeValue = useCallback(() => {
        try {
            localStorage.removeItem(key);
            setValue(defaultValue);
        } catch (error) {
            logger.error(`Error removing localStorage key "${key}":`, error);
        }
    }, [key, defaultValue]);

    return [value, setValue, removeValue] as const;
}

/**
 * Simple read-only hook for getting a value from localStorage without managing state.
 * Useful for one-time reads or when you don't need reactivity.
 *
 * @param key - The localStorage key
 * @param defaultValue - Default value if key doesn't exist
 * @returns The stored value or default
 */
export function getFromStorage<T>(key: string, defaultValue: T): T {
    try {
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : defaultValue;
    } catch (error) {
        logger.error(`Error reading localStorage key "${key}":`, error);
        return defaultValue;
    }
}

/**
 * Simple write function for localStorage with error handling.
 *
 * @param key - The localStorage key
 * @param data - Data to store (will be JSON stringified)
 */
export function saveToStorage<T>(key: string, data: T): void {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        logger.error(`Error writing to localStorage key "${key}":`, error);
    }
}
