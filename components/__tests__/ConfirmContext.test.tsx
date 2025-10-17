import React from 'react';

import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ConfirmProvider, useConfirm } from '../ConfirmContext';

// Mock ToastContext to avoid side effects
vi.mock('../toast/ToastContext', () => ({
  useToast: () => ({ pushToast: vi.fn(), removeToast: vi.fn(), toasts: [] }),
}));

const Consumer: React.FC = () => {
  const confirm = useConfirm();
  return (
    <button onClick={() => confirm('Are you sure?').then(() => { })}>Ask</button>
  );
};

describe('ConfirmContext', () => {
  it('throws if useConfirm is used outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => { });
    expect(() => render(<Consumer />)).toThrow(/useConfirm must be used within a ConfirmProvider/);
    spy.mockRestore();
  });

  it('renders children and opens modal on confirm', async () => {
    render(
      <ConfirmProvider>
        <Consumer />
      </ConfirmProvider>,
    );
    act(() => {
      screen.getByText('Ask').click();
    });
    // Modal should open with message
    expect(await screen.findByText(/are you sure/i)).toBeInTheDocument();
    // Confirm and Cancel buttons should be present
    expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
    expect(screen.getByText(/cancel/i)).toBeInTheDocument();
  });
});
