import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import SearchPanel from '../SearchPanel';

const baseProps = {
  isOpen: true,
  onClose: vi.fn(),
  onQueryChange: vi.fn(),
  onNavigate: vi.fn(),
  results: [
    { excerpt: 'This is a test excerpt with the word apple.', cfi: 'cfi-1' },
    { excerpt: 'Another result mentioning banana.', cfi: 'cfi-2' },
  ],
  isLoading: false,
  searchQuery: 'apple',
};

describe('SearchPanel accessibility', () => {
  it('has correct ARIA roles and supports keyboard navigation', async () => {
    render(<SearchPanel {...baseProps} />);
    // Dialog has role dialog
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    // Heading is labelled
    expect(screen.getByRole('heading', { name: /search/i })).toBeInTheDocument();
    // Search input is labelled and focused
    const input = screen.getByLabelText(/search input/i);
    expect(input).toBeInTheDocument();
    expect(input).toHaveFocus();
    // Tab to first result
    const user = userEvent.setup();
    await user.tab(); // Should move to first result button
    const firstResult = screen.getAllByRole('button')[1]; // [0] is close, [1] is first result
    expect(document.activeElement).toBe(firstResult);
    // Tab to next result
    await user.tab();
    const secondResult = screen.getAllByRole('button')[2];
    expect(document.activeElement).toBe(secondResult);
  });
});
