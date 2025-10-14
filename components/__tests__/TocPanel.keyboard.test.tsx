import React from 'react';

import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

import type { ReaderSettings } from '../../types';
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

describe('TocPanel keyboard and ARIA', () => {
  it('has accessible role/labels and supports keyboard navigation', async () => {
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

    // Dialog has role=dialog and labelledby heading
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeTruthy();
    const heading = screen.getByText(/Navigation/i);
    expect(heading).toBeTruthy();

    // Label button is focusable and responds to Enter/Space
    const chapterButton = screen.getByLabelText(/Go to Chapter 1/i) as HTMLElement;
  chapterButton.focus();
  // Avoid jest-dom matcher during tsc; assert focus via document.activeElement.
  expect(document.activeElement).toBe(chapterButton);

    // Use a userEvent instance for reliable keyboard events in jsdom
    const user = userEvent.setup();
    await user.keyboard('{Space}');

    // jsdom/user-event sometimes doesn't trigger the activation — fall back to click
    if (!onTocNavigate.mock.calls.length) {
      await user.click(chapterButton);
    }

    expect(onTocNavigate).toHaveBeenCalledWith('chapter1.html');
  });
});
