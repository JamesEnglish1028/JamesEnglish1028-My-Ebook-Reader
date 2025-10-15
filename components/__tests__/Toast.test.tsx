import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Toast from '../Toast';

describe('Toast', () => {
  it('renders nothing if message is null', () => {
    render(<Toast message={null} />);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('renders the message and is accessible', () => {
    render(<Toast message="Hello world!" />);
    const toast = screen.getByRole('status');
    expect(toast).toBeInTheDocument();
    expect(toast).toHaveTextContent('Hello world!');
    expect(toast).toHaveAttribute('aria-live', 'polite');
  });

  it('calls onClose after duration', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    render(<Toast message="Bye!" duration={1000} onClose={onClose} />);
    expect(onClose).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onClose).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('focuses the toast for accessibility', () => {
    render(<Toast message="Focus me!" />);
    const toast = screen.getByRole('status');
    expect(document.activeElement).toBe(toast);
  });
});
