import { render, screen } from '@testing-library/react';
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
      />,
    );
    // Dialog has role dialog
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    // Heading is labelled
    expect(screen.getByRole('heading', { name: /delete item/i })).toBeInTheDocument();
    // Cancel button should have initial focus
    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    expect(document.activeElement).toBe(cancelBtn);
    // Get all buttons in DOM order
    const buttons = screen.getAllByRole('button');
    // Button 0: Close, Button 1: Cancel, Button 2: Delete
    expect(buttons[1]).toBe(cancelBtn);
    const confirmBtn = screen.getByRole('button', { name: /delete/i });
    expect(buttons[2]).toBe(confirmBtn);
    const closeBtn = screen.getByRole('button', { name: /close/i });
    expect(buttons[0]).toBe(closeBtn);
  });
});
