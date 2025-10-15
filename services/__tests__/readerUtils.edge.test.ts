import { beforeEach, describe, expect, it } from 'vitest';
import { READER_KEYS, getStorageKey } from '../../constants';
import * as readerUtils from '../readerUtils';

describe('readerUtils.ts - settings, bookmarks, and error/edge cases', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('getReaderSettings returns defaults if nothing saved', () => {
    const settings = readerUtils.getReaderSettings();
    expect(settings.fontSize).toBe(100);
    expect(settings.theme).toBe('light');
  });

  it('getReaderSettings merges saved settings', () => {
    localStorage.setItem(READER_KEYS.GLOBAL_SETTINGS, JSON.stringify({ fontSize: 120, theme: 'dark' }));
    const settings = readerUtils.getReaderSettings();
    expect(settings.fontSize).toBe(120);
    expect(settings.theme).toBe('dark');
  });

  it('getBookmarksForBook returns [] if nothing saved', () => {
    expect(readerUtils.getBookmarksForBook(1)).toEqual([]);
  });

  it('getBookmarksForBook returns saved bookmarks', () => {
    localStorage.setItem(getStorageKey.bookmarks(1), JSON.stringify([{ cfi: 'foo', label: 'bar' }]));
    const bms = readerUtils.getBookmarksForBook(1);
    expect(bms.length).toBe(1);
    expect(bms[0].cfi).toBe('foo');
  });

  it('getBookmarksForBook handles malformed JSON gracefully', () => {
    localStorage.setItem(getStorageKey.bookmarks(1), 'not-json');
    expect(readerUtils.getBookmarksForBook(1)).toEqual([]);
  });

  it('getLastPositionForBook returns null if not set', () => {
    expect(readerUtils.getLastPositionForBook(1)).toBeNull();
  });

  it('getLastPositionForBook returns saved value', () => {
    localStorage.setItem(getStorageKey.position(1), 'cfi-123');
    expect(readerUtils.getLastPositionForBook(1)).toBe('cfi-123');
  });

  it('getPdfViewStateForBook returns default if not set', () => {
    expect(readerUtils.getPdfViewStateForBook(1)).toEqual({ zoomPercent: 100, fitMode: 'page' });
  });

  it('getPdfViewStateForBook handles malformed JSON gracefully', () => {
    localStorage.setItem(getStorageKey.pdfViewState(1), 'not-json');
    expect(readerUtils.getPdfViewStateForBook(1)).toEqual({ zoomPercent: 100, fitMode: 'page' });
  });
});
