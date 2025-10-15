import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';

import type { CatalogBook } from '../../types';
import BookDetailView from '../BookDetailView';

// Mock the ToastContext
const mockUseToast = vi.fn(() => ({
  showToast: vi.fn(),
}));

vi.mock('../toast/ToastContext', () => ({
  useToast: () => mockUseToast(),
}));

describe('BookDetailView Distributor Display Integration', () => {
  afterEach(() => {
    cleanup();
  });

  test('displays distributor information for catalog books in UI', () => {
    // Create a catalog book with distributor (exactly like what comes from OPDS parsing)
    const catalogBookWithDistributor: CatalogBook = {
      title: 'Geschichte der Komparatistik in Programmtexten',
      author: 'Carsten Zelle',
      coverImage: null,
      downloadUrl: 'https://example.com/download',
      summary: 'A test book summary',
      distributor: 'OAPEN', // This should be displayed
      publisher: undefined,
      publicationDate: '2024-01-01',
      subjects: ['Literature', 'Comparative Studies'],
      format: 'PDF',
      acquisitionMediaType: 'application/pdf',
    };

    const mockProps = {
      book: catalogBookWithDistributor,
      source: 'catalog' as const,
      catalogName: 'Palace Test Library',
      onBack: vi.fn(),
      onReadBook: vi.fn(),
      onImportFromCatalog: vi.fn(),
      importStatus: { isLoading: false, message: '', error: null },
      setImportStatus: vi.fn(),
    };

    // Render the BookDetailView component
    render(<BookDetailView {...mockProps} />);

    // Check that the book title is displayed (appears in both h1 and cover placeholder)
    expect(screen.getAllByText('Geschichte der Komparatistik in Programmtexten').length).toBeGreaterThan(0);

    // Check that the Publication Details section exists
    expect(screen.getByText('Publication Details')).toBeInTheDocument();

    // Check that the Distributor field is displayed
    expect(screen.getByText('Distributor')).toBeInTheDocument();
    expect(screen.getByText('OAPEN')).toBeInTheDocument();

    console.log('✅ BookDetailView correctly displays distributor information for catalog books');
  });

  test('displays distributor for BiblioBoard books', () => {
    const biblioboardBook: CatalogBook = {
      title: 'Embracing Watershed Politics',
      author: 'Edella Schlager',
      coverImage: null,
      downloadUrl: 'https://example.com/download2',
      summary: 'Another test book',
      distributor: 'BiblioBoard',
      format: 'PDF',
    };

    const mockProps = {
      book: biblioboardBook,
      source: 'catalog' as const,
      onBack: vi.fn(),
      onReadBook: vi.fn(),
      onImportFromCatalog: vi.fn(),
      importStatus: { isLoading: false, message: '', error: null },
      setImportStatus: vi.fn(),
    };

    render(<BookDetailView {...mockProps} />);

    // Verify distributor is shown
    expect(screen.getByText('Distributor')).toBeInTheDocument();
    expect(screen.getByText('BiblioBoard')).toBeInTheDocument();

    console.log('✅ BookDetailView correctly displays BiblioBoard distributor');
  });

  test('hides distributor section when no distributor is present', () => {
    const bookWithoutDistributor: CatalogBook = {
      title: 'Book Without Distributor',
      author: 'Test Author',
      coverImage: null,
      downloadUrl: 'https://example.com/download3',
      summary: 'Book without distributor info',
      format: 'EPUB',
      // No distributor field
    };

    const mockProps = {
      book: bookWithoutDistributor,
      source: 'catalog' as const,
      onBack: vi.fn(),
      onReadBook: vi.fn(),
      onImportFromCatalog: vi.fn(),
      importStatus: { isLoading: false, message: '', error: null },
      setImportStatus: vi.fn(),
    };

    render(<BookDetailView {...mockProps} />);

    // Verify distributor label is not shown when no distributor
    expect(screen.queryByText('Distributor')).not.toBeInTheDocument();

    console.log('✅ BookDetailView correctly hides distributor when not present');
  });
});
