import React from 'react';

import { render, screen, fireEvent } from '@testing-library/react';
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

const nestedToc = [
  {
    id: '1', href: 'c1.html', label: 'C1',
    subitems: [
      { id: '1.1', href: 'c1-1.html', label: 'C1.1', subitems: [
        { id: '1.1.1', href: 'c1-1-1.html', label: 'C1.1.1' },
      ] },
    ],
  },
];

describe('TocPanel nested behaviour', () => {
  it('expands nested levels and allows navigation at deep levels', async () => {
    const onTocNavigate = vi.fn();

    render(<TocPanel isOpen={true} onClose={() => {}} toc={nestedToc as any} onTocNavigate={onTocNavigate} bookmarks={[]} onBookmarkNavigate={() => {}} onDeleteBookmark={() => {}} citations={[]} onCitationNavigate={() => {}} onDeleteCitation={() => {}} settings={mockSettings} bookData={null} />);

    // top-level chevron
    const chevrons = screen.getAllByRole('button');
    // find an Expand button for C1
    const expandBtn = chevrons.find(b => b.getAttribute('aria-label')?.includes('Expand'));
    expect(expandBtn).toBeDefined();
    if (expandBtn) fireEvent.click(expandBtn);

    // expand second level
    const expandBtn2 = screen.getAllByRole('button').find(b => b.getAttribute('aria-label')?.includes('Expand') && b !== expandBtn);
    if (expandBtn2) fireEvent.click(expandBtn2);

    // Now the deep label should be visible and clickable
    const deepLabel = await screen.findByText('C1.1.1');
    fireEvent.click(deepLabel.closest('button')!);
    expect(onTocNavigate).toHaveBeenCalledWith('c1-1-1.html');
  });
});
