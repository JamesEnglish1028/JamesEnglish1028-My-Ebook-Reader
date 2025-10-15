import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ConfirmModal from '../ConfirmModal';

describe('ConfirmModal accessibility', () => {
  it('has correct ARIA roles and supports keyboard navigation', async () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    render(
      <ConfirmModal
        isOpen={true}
        title="Delete Item"
        message="Are you sure you want to delete this item?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onClose={onClose}
        onConfirm={onConfirm}
        variant="danger"
      />
    );
    // Dialog has role dialog
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    // Heading is labelled
    expect(screen.getByRole('heading', { name: /delete item/i })).toBeInTheDocument();
    // Cancel button should have initial focus
    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    expect(document.activeElement).toBe(cancelBtn);
    // Debug: log active element after initial focus
    // eslint-disable-next-line no-console
    console.log('After initial focus:', document.activeElement?.outerHTML);
    // Tab to Confirm button
    const user = userEvent.setup();
    await user.tab();
    // Debug: log active element after first Tab
    console.log('After first Tab:', document.activeElement?.outerHTML);
    const confirmBtn = screen.getByRole('button', { name: /delete/i });
    expect(document.activeElement).toBe(confirmBtn);
    // Tab to Close button (should be next)
    await user.tab();
    // Debug: log active element after second Tab
    console.log('After second Tab:', document.activeElement?.outerHTML);
    const closeBtn = screen.getByRole('button', { name: /close/i });
    expect(document.activeElement).toBe(closeBtn);
  });
});
