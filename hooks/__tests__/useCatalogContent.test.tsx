
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useCatalogContent } from '../useCatalogContent';

vi.mock('../../services/opds', () => ({
  fetchCatalogContent: vi.fn().mockResolvedValue({
    books: [{ id: '1', title: 'Book 1' }],
    navLinks: [],
    pagination: {},
    error: null
  })
}));

describe('useCatalogContent', () => {
  it('fetches and returns catalog content', async () => {
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useCatalogContent('url', 'base', 'auto'), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.books[0].title).toBe('Book 1');
  });
});
