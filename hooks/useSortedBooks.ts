import { useMemo } from 'react';

import { LIBRARY_KEYS } from '../constants';
import type { BookMetadata } from '../types';

export type SortOrder =
    | 'added-desc'
    | 'added-asc'
    | 'title-asc'
    | 'title-desc'
    | 'author-asc'
    | 'author-desc'
    | 'pubdate-asc'
    | 'pubdate-desc';

/**
 * Default sort order key for localStorage
 */
export const SORT_ORDER_STORAGE_KEY = LIBRARY_KEYS.SORT_ORDER;

/**
 * Custom hook for sorting books based on various criteria.
 * Uses useMemo to avoid unnecessary re-computations.
 *
 * @param books - Array of books to sort
 * @param sortOrder - Sort order string (e.g., 'title-asc', 'author-desc')
 * @returns Sorted array of books
 *
 * @example
 * const sortedBooks = useSortedBooks(books, 'title-asc');
 */
export function useSortedBooks(books: BookMetadata[], sortOrder: SortOrder): BookMetadata[] {
    return useMemo(() => {
        const sorted = [...books];
        const [key, direction] = sortOrder.split('-') as [string, 'asc' | 'desc'];

        sorted.sort((a, b) => {
            let valA: any;
            let valB: any;

            switch (key) {
                case 'title':
                    valA = a.title.toLowerCase();
                    valB = b.title.toLowerCase();
                    break;
                case 'author':
                    valA = a.author.toLowerCase();
                    valB = b.author.toLowerCase();
                    break;
                case 'pubdate':
                    valA = a.publicationDate ? new Date(a.publicationDate).getTime() : 0;
                    valB = b.publicationDate ? new Date(b.publicationDate).getTime() : 0;
                    if (isNaN(valA)) valA = 0;
                    if (isNaN(valB)) valB = 0;
                    break;
                case 'added':
                default:
                    valA = a.id!;
                    valB = b.id!;
                    break;
            }

            if (valA < valB) return direction === 'asc' ? -1 : 1;
            if (valA > valB) return direction === 'asc' ? 1 : -1;
            return 0;
        });

        return sorted;
    }, [books, sortOrder]);
}

/**
 * Available sort options with human-readable labels.
 * Can be used to populate dropdowns or sort menus.
 */
export const SORT_OPTIONS: { key: SortOrder; label: string }[] = [
    { key: 'added-desc', label: 'Recently Added' },
    { key: 'title-asc', label: 'Title (A-Z)' },
    { key: 'title-desc', label: 'Title (Z-A)' },
    { key: 'author-asc', label: 'Author (A-Z)' },
    { key: 'author-desc', label: 'Author (Z-A)' },
    { key: 'pubdate-desc', label: 'Publication Date (Newest)' },
    { key: 'pubdate-asc', label: 'Publication Date (Oldest)' },
];
