
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useGlobalShortcuts } from '../useGlobalShortcuts';

describe('useGlobalShortcuts', () => {
  it('registers and triggers shortcut actions', () => {
    const action = vi.fn();
    renderHook(() => useGlobalShortcuts({
      shortcuts: [
        { key: 'a', description: 'Test', action }
      ]
    }));
    // Patch: Provide a valid event.target for jsdom
    const button = document.createElement('button');
    document.body.appendChild(button);
    const event = new KeyboardEvent('keydown', { key: 'a', bubbles: true });
    Object.defineProperty(event, 'target', { value: button });
    button.dispatchEvent(event);
    expect(action).toHaveBeenCalledWith(event);
    document.body.removeChild(button);
  });
});
