
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useCatalogs } from '../useCatalogs';

vi.mock('../useLocalStorage', () => ({
  useLocalStorage: (key: string, defaultValue: any) => [[], vi.fn(), vi.fn()]
}));

describe('useCatalogs', () => {
  it('returns catalogs and management functions', () => {
    const { result } = renderHook(() => useCatalogs());
    expect(result.current).toHaveProperty('catalogs');
    expect(result.current).toHaveProperty('addCatalog');
    expect(result.current).toHaveProperty('deleteCatalog');
    expect(result.current).toHaveProperty('updateCatalog');
  });
});
