import { describe, it, expect, beforeEach } from 'vitest';

import * as reader from '../readerUtils';

beforeEach(() => {
  localStorage.clear();
});

describe('readerUtils smoke tests', () => {
  it('saves and retrieves reader settings', () => {
    const defaultSettings = reader.getReaderSettings();
    expect(defaultSettings).toBeTruthy();

    const newSettings = {
      ...defaultSettings,
      fontSize: 120,
      readAloud: { ...defaultSettings.readAloud, rate: 1.1 },
    } as any;

    reader.saveReaderSettings(newSettings);
    const loaded = reader.getReaderSettings();
    expect(loaded.fontSize).toBe(120);
    expect(loaded.readAloud.rate).toBe(1.1);
  });

  it('saves and retrieves bookmarks for a book', () => {
    const bookId = 42;
    const bm = [{ id: 'b1', cfi: 'epubcfi(/6/2[chapter01]!/4/1:0)' }];
    reader.saveBookmarksForBook(bookId, bm as any);
    const loaded = reader.getBookmarksForBook(bookId);
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('b1');
  });

  it('saves and retrieves citations for a book', () => {
    const bookId = 42;
  const cs = [{ id: 'c1', note: 'Citation text', cfi: '', createdAt: Date.now() }];
    reader.saveCitationsForBook(bookId, cs as any);
    const loaded = reader.getCitationsForBook(bookId);
    expect(loaded).toHaveLength(1);
  expect(loaded[0].note).toBe('Citation text');
  });

  it('saves and retrieves pdf view state', () => {
    const bookId = 7;
    reader.savePdfViewStateForBook(bookId, { zoomPercent: 150, fitMode: 'width' });
    const s = reader.getPdfViewStateForBook(bookId);
    expect(s.zoomPercent).toBe(150);
    expect(s.fitMode).toBe('width');
  });
});
