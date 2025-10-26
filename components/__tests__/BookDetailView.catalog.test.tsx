import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';

import BookDetailView from '../BookDetailView';
import { catalogBook, defaultImportStatus } from './fixtures/bookDetailViewFixtures';

const mockUseToast = vi.fn(() => ({
  showToast: vi.fn(),
}));
vi.mock('../toast/ToastContext', () => ({
  useToast: () => mockUseToast(),
}));

describe('BookDetailView Catalog Book UI', () => {
  afterEach(() => {
    cleanup();
  });

  test('shows Import to My Library button and provider info', () => {
    const mockProps = {
      book: catalogBook,
      source: 'catalog' as const,
      catalogName: 'OAPEN Library',
      onBack: vi.fn(),
      onReadBook: vi.fn(),
      onImportFromCatalog: vi.fn(),
      importStatus: defaultImportStatus,
      setImportStatus: vi.fn(),
      userCitationFormat: 'apa',
    };
    render(<BookDetailView {...mockProps} />);
    expect(screen.getByText('Return to Catalog')).toBeInTheDocument();
    expect(screen.getByText('Import to My Library')).toBeInTheDocument();
    const providerElements = screen.getAllByText(/Provider/i);
    expect(providerElements.some(el => el.textContent?.trim() === 'Provider:')).toBe(true);
    expect(screen.getByText('OAPEN Library')).toBeInTheDocument();
  });
});
