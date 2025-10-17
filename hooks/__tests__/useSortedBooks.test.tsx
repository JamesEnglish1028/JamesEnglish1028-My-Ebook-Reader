
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { BookMetadata } from '../../types';
import { useSortedBooks } from '../useSortedBooks';

describe('useSortedBooks', () => {
  const books: BookMetadata[] = [
    { id: 2, title: 'Zebra', author: 'Alice', coverImage: null, publicationDate: '2020-01-01' },
    { id: 1, title: 'Apple', author: 'Bob', coverImage: null, publicationDate: '2022-01-01' },
    { id: 3, title: 'Monkey', author: 'Charlie', coverImage: null, publicationDate: '2019-01-01' },
  ];

  it('sorts by title ascending', () => {
    const { result } = renderHook(() => useSortedBooks(books, 'title-asc'));
    expect(result.current.map(b => b.title)).toEqual(['Apple', 'Monkey', 'Zebra']);
  });

  it('sorts by title descending', () => {
    const { result } = renderHook(() => useSortedBooks(books, 'title-desc'));
    expect(result.current.map(b => b.title)).toEqual(['Zebra', 'Monkey', 'Apple']);
  });

  it('sorts by author ascending', () => {
    const { result } = renderHook(() => useSortedBooks(books, 'author-asc'));
    expect(result.current.map(b => b.author)).toEqual(['Alice', 'Bob', 'Charlie']);
  });

  it('sorts by publication date descending', () => {
    const { result } = renderHook(() => useSortedBooks(books, 'pubdate-desc'));
    expect(result.current.map(b => b.publicationDate)).toEqual(['2022-01-01', '2020-01-01', '2019-01-01']);
  });

  it('sorts by added (id) ascending', () => {
    const { result } = renderHook(() => useSortedBooks(books, 'added-asc'));
    expect(result.current.map(b => b.id)).toEqual([1, 2, 3]);
  });

  it('sorts by added (id) descending', () => {
    const { result } = renderHook(() => useSortedBooks(books, 'added-desc'));
    expect(result.current.map(b => b.id)).toEqual([3, 2, 1]);
  });
});
