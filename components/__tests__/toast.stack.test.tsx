import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider, useToast } from '../toast/ToastContext';
import ToastStack from '../toast/ToastStack';
import { describe, test, expect } from 'vitest';

const TestHarness: React.FC = () => {
  const toast = useToast();
  return (
    <div>
      <button onClick={() => toast.pushToast('Hello World', 2000)}>Push</button>
      <ToastStack />
    </div>
  );
};

describe('ToastStack', () => {
  test('shows pushed toast message', async () => {
    render(
      <ToastProvider>
        <TestHarness />
      </ToastProvider>
    );

    const btn = screen.getByRole('button', { name: /push/i });
    await act(async () => {
      userEvent.click(btn);
    });

    expect(await screen.findByText('Hello World')).toBeInTheDocument();

  // Close via close button and wait for DOM update
  const close = screen.getByRole('button', { name: /close/i });
  await act(async () => userEvent.click(close));
  await waitFor(() => expect(screen.queryByText('Hello World')).not.toBeInTheDocument());
  });
});
