
import React from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useAddCatalog } from '../useCatalogMutations';

vi.mock('../useLocalStorage', () => ({
  useLocalStorage: () => [[], vi.fn(), vi.fn()],
}));

describe('useAddCatalog', () => {
  it('returns a mutation object', () => {
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useAddCatalog(), { wrapper });
    expect(result.current).toHaveProperty('mutate');
    expect(result.current).toHaveProperty('isPending');
  });
});
