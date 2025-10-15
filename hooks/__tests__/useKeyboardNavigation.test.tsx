
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useKeyboardNavigation } from '../useKeyboardNavigation';

describe('useKeyboardNavigation', () => {
  it('calls onArrowKey callback for arrow keys', () => {
    const onArrowKey = vi.fn();
    renderHook(() => useKeyboardNavigation({ enableArrowKeys: true, onArrowKey }));
    const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
    window.dispatchEvent(event);
    expect(onArrowKey).toHaveBeenCalledWith('down', event);
  });

  it('calls onActivate callback for Enter/Space', () => {
    const onActivate = vi.fn();
    renderHook(() => useKeyboardNavigation({ enableActivation: true, onActivate }));
    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
    window.dispatchEvent(enterEvent);
    expect(onActivate).toHaveBeenCalledWith(enterEvent);
    const spaceEvent = new KeyboardEvent('keydown', { key: ' ' });
    window.dispatchEvent(spaceEvent);
    expect(onActivate).toHaveBeenCalledWith(spaceEvent);
  });

  it('calls onEscape callback for Escape', () => {
    const onEscape = vi.fn();
    renderHook(() => useKeyboardNavigation({ enableEscape: true, onEscape }));
    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    window.dispatchEvent(event);
    expect(onEscape).toHaveBeenCalledWith(event);
  });
});
