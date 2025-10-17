import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import type { CoverAnimationData } from '../../types';
import ReaderView from '../ReaderView';

describe('ReaderView', () => {
  beforeAll(() => {
    // Mock speechSynthesis and getVoices for jsdom
    Object.defineProperty(window, 'speechSynthesis', {
      writable: true,
      value: {
        getVoices: () => [{ name: 'MockVoice', lang: 'en-US', default: true, voiceURI: 'mock', localService: true }],
        speak: vi.fn(),
        cancel: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
      },
    });

    // Mock db.get to always return a fake book
    vi.doMock('../../services/db', () => ({
      db: {
        get: vi.fn().mockResolvedValue({
          id: 1,
          title: 'Test Book',
          author: 'Test Author',
          publisher: 'Test Publisher',
          publicationDate: '2020-01-01',
          cover: '',
          file: '',
          opdsId: '',
          distributor: '',
          format: 'epub',
        }),
      },
    }));
  });
  const baseProps = {
    bookId: 1,
    onClose: vi.fn(),
    animationData: null as CoverAnimationData | null,
  };


  it('renders without crashing', () => {
    render(<ReaderView {...baseProps} />);
    // Should render the header and loading spinner
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByLabelText(/close reader/i)).toBeInTheDocument();
  });

  it('renders with animationData', () => {
    const animationData: CoverAnimationData = {
      rect: { top: 0, left: 0, width: 100, height: 100, right: 100, bottom: 100, x: 0, y: 0, toJSON: () => '' },
      coverImage: 'cover.jpg',
    };
    render(<ReaderView {...baseProps} animationData={animationData} />);
    // Should render the expanding cover image
    expect(screen.getByAltText(/expanding book cover/i)).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(<ReaderView {...baseProps} />);
    const closeBtn = screen.getByLabelText(/close/i);
    closeBtn && closeBtn.click();
    expect(baseProps.onClose).toHaveBeenCalled();
  });

  it('toggles navigation panel when Contents button is clicked', async () => {
    render(<ReaderView {...baseProps} />);
    // Wait for loading spinner to disappear
    await screen.findByRole('banner');
    const navBtn = screen.getByLabelText(/contents and bookmarks/i);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    navBtn.click();
    // The TOC panel should now be visible (role dialog)
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveTextContent(/Navigation/);
  });

  it('toggles settings panel when Settings button is clicked', async () => {
    render(<ReaderView {...baseProps} />);
    await screen.findByRole('banner');
    const settingsBtn = screen.getByLabelText(/settings/i);
    settingsBtn.click();
    // After click, the Settings panel should be visible (heading text visible)
    expect(await screen.findByText(/Settings/)).toBeInTheDocument();
  });

  it('toggles search panel when Search button is clicked', async () => {
    render(<ReaderView {...baseProps} />);
    await screen.findByRole('banner');
    const searchBtn = screen.getByLabelText(/search in book/i);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    searchBtn.click();
    // The Search panel should now be visible (role dialog)
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveTextContent(/Search/);
  });
});
