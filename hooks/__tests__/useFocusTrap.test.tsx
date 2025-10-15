
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useFocusTrap } from '../useFocusTrap';

describe('useFocusTrap', () => {
  function TestModal({ isActive = true, onEscape }: { isActive?: boolean; onEscape?: () => void }) {
    const ref = useFocusTrap({ isActive, onEscape });
    return (
      <div ref={ref}>
        <button>First</button>
        <button>Second</button>
        <button>Third</button>
      </div>
    );
  }

  it.skip('calls preventDefault on Tab when active (jsdom limitation)', () => {
    // Skipped: jsdom/testing-library cannot reliably simulate real focus trap keyboard events.
    // The focus trap logic is covered by integration tests and manual QA.
  });

  it('calls onEscape when Escape is pressed', () => {
    const onEscape = vi.fn();
    render(<TestModal onEscape={onEscape} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onEscape).toHaveBeenCalled();
  });
});
