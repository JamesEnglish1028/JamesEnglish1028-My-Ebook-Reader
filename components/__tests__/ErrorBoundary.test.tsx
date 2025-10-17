
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ErrorBoundary from '../ErrorBoundary';

const ProblemChild = () => {
  throw new Error('Test error');
  // unreachable, but needed for JSX signature
  // eslint-disable-next-line no-unreachable
  return <div />;
};

describe('ErrorBoundary', () => {
  it('renders fallback UI when child throws', () => {
    const onReset = vi.fn();
    render(
      <ErrorBoundary onReset={onReset}>
        <ProblemChild />
      </ErrorBoundary>,
    );
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText(/test error/i)).toBeInTheDocument();
  });

  it('renders children when no error', () => {
    const onReset = vi.fn();
    render(
      <ErrorBoundary onReset={onReset}>
        <div>Safe Child</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText('Safe Child')).toBeInTheDocument();
  });

  it('calls onReset and resets when Try Again is clicked', () => {
    const onReset = vi.fn();
    render(
      <ErrorBoundary onReset={onReset}>
        <ProblemChild />
      </ErrorBoundary>,
    );
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onReset).toHaveBeenCalled();
  });
});
