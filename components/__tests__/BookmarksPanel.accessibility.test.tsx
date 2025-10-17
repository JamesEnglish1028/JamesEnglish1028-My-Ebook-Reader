import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import BookmarksPanel from '../BookmarksPanel';

describe('BookmarksPanel accessibility', () => {
  it('has correct ARIA roles and supports keyboard navigation', async () => {
    const bookmarks = [
      { id: 'b1', cfi: 'cfi1', label: 'Bookmark 1', created: new Date().toISOString() },
      { id: 'b2', cfi: 'cfi2', label: 'Bookmark 2', created: new Date().toISOString() },
    ];
    const onNavigate = vi.fn();
    const onDelete = vi.fn();
    render(
      <BookmarksPanel
        isOpen={true}
        onClose={vi.fn()}
        bookmarks={bookmarks}
        onNavigate={onNavigate}
        onDelete={onDelete}
      />,
    );
    // Panel has role dialog
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    // Bookmarks are focusable and navigable
    const firstBookmarkBtn = screen.getByLabelText('Go to bookmark: Bookmark 1');
    firstBookmarkBtn.focus();
    expect(document.activeElement).toBe(firstBookmarkBtn);
    const user = userEvent.setup();
    await user.keyboard('{Enter}');
    expect(onNavigate).toHaveBeenCalledWith('cfi1');
  });
});
