import React from 'react';

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import type { ReaderSettings } from '../../types';
import { BookRecord } from '../../types';
import TocPanel from '../TocPanel';

const mockSettings: ReaderSettings = {
  fontSize: 100,
  theme: 'light',
  flow: 'paginated',
  fontFamily: 'Original',
  citationFormat: 'apa',
  readAloud: { voiceURI: null, rate: 0.9, pitch: 1, volume: 1 },
};

const sampleToc = [
  {
    id: '1',
    href: 'chapter1.html',
    label: 'Chapter 1',
    subitems: [
      { id: '1.1', href: 'chapter1.html#sec1', label: 'Section 1' },
    ],
  },
];

describe('TocPanel', () => {
  it('navigates when label clicked and toggles expansion when chevron clicked', async () => {
    const onTocNavigate = vi.fn();
    const onBookmarkNavigate = vi.fn();
    const onDeleteBookmark = vi.fn();
    const onCitationNavigate = vi.fn();
    const onDeleteCitation = vi.fn();
    const onClose = vi.fn();

    render(
      <TocPanel
        isOpen={true}
        onClose={onClose}
        toc={sampleToc as any}
        onTocNavigate={onTocNavigate}
        bookmarks={[]}
        onBookmarkNavigate={onBookmarkNavigate}
        onDeleteBookmark={onDeleteBookmark}
        citations={[]}
        onCitationNavigate={onCitationNavigate}
        onDeleteCitation={onDeleteCitation}
        settings={mockSettings}
        bookData={null}
      />,
    );

    // Label click should navigate
    const chapterButton = screen.getByLabelText(/Go to Chapter 1/i);
    fireEvent.click(chapterButton);
    expect(onTocNavigate).toHaveBeenCalledWith('chapter1.html');

    // Chevron click should expand subitems but not call navigate
    const chevronButtons = screen.getAllByRole('button');
    // Find the chevron button by excluding the label button and other header buttons
    const chevron = chevronButtons.find(b => b.getAttribute('aria-label')?.includes('Expand'));
    expect(chevron).toBeDefined();
    if (chevron) {
      fireEvent.click(chevron);
      // subitem should now be in the document
      expect(await screen.findByText('Section 1')).toBeTruthy();
    }
  });
});
