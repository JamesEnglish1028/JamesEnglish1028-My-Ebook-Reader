
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useLocalStorage } from '../useLocalStorage';

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns default value if key is missing', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'));
    expect(result.current[0]).toBe('default');
  });

  it('sets and persists value', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'));
    act(() => {
      result.current[1]('new-value');
    });
    expect(result.current[0]).toBe('new-value');
    expect(localStorage.getItem('test-key')).toBe(JSON.stringify('new-value'));
  });

  it('removes value and resets to default', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'));
    act(() => {
      result.current[1]('new-value');
      result.current[2]();
    });
    expect(result.current[0]).toBe('default');
    expect(localStorage.getItem('test-key')).toBeNull();
  });
});
