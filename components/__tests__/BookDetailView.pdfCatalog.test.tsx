import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';

import BookDetailView from '../BookDetailView';
import { pdfCatalogBook, defaultImportStatus } from './fixtures/bookDetailViewFixtures';

const mockUseToast = vi.fn(() => ({
  showToast: vi.fn(),
}));
vi.mock('../toast/ToastContext', () => ({
  useToast: () => mockUseToast(),
}));

describe('BookDetailView PDF Catalog Book UI', () => {
  afterEach(() => {
    cleanup();
  });

  test('shows Import to My Library button and provider info for PDF', () => {
    const mockProps = {
      book: pdfCatalogBook,
      source: 'catalog' as const,
      onBack: vi.fn(),
      onReadBook: vi.fn(),
      onImportFromCatalog: vi.fn(),
      importStatus: defaultImportStatus,
      setImportStatus: vi.fn(),
      userCitationFormat: 'mla' as 'apa' | 'mla',
    };
    render(<BookDetailView {...mockProps} />);
    expect(screen.getByText('Import to My Library')).toBeInTheDocument();
    expect(screen.getByText('BiblioBoard')).toBeInTheDocument();
  });
});
