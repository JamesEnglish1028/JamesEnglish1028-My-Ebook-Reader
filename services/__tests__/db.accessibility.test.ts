
import { describe, it, expect } from 'vitest';
import { BookRecord } from '../../domain/book/types';
import { db } from '../db';

describe('DB and repository accessibility roundtrip', () => {
  it('saves and loads BookRecord with accessibility fields intact', async () => {
    const book: BookRecord = {
      title: 'Test Book',
      author: 'Author',
      coverImage: null,
      epubData: new ArrayBuffer(8),
      accessibilityFeatures: ['altText'],
      accessModes: ['textual'],
      accessModesSufficient: ['textual'],
      hazards: ['none'],
      accessibilitySummary: 'Summary',
      certificationConformsTo: ['WCAG2.2AA'],
      certification: 'Certified',
      accessibilityFeedback: 'Feedback',
    };
    const id = await db.saveBook(book);
    const loaded = await db.getBook(id);
    expect(loaded?.accessibilityFeatures).toEqual(['altText']);
    expect(loaded?.accessModes).toEqual(['textual']);
    expect(loaded?.accessModesSufficient).toEqual(['textual']);
    expect(loaded?.hazards).toEqual(['none']);
    expect(loaded?.accessibilitySummary).toBe('Summary');
    expect(loaded?.certificationConformsTo).toEqual(['WCAG2.2AA']);
    expect(loaded?.certification).toBe('Certified');
    expect(loaded?.accessibilityFeedback).toBe('Feedback');
  });
});
