
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useBooks } from '../useBooks';

vi.mock('../../domain/book', () => ({
  bookRepository: {
    findAllMetadata: vi.fn().mockResolvedValue({
      success: true, data: [
        { id: 1, title: 'Book 1', author: 'Author 1', coverImage: null },
        { id: 2, title: 'Book 2', author: 'Author 2', coverImage: null },
      ]
    })
  }
}));

describe('useBooks', () => {
  it('fetches and returns book metadata', async () => {
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useBooks(), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.length).toBe(2);
    expect(result.current.data?.[0].title).toBe('Book 1');
  });
});
