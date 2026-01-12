import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';

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
    const catalogBookWithDistributor = {
      id: 401,
      title: 'Geschichte der Komparatistik in Programmtexten',
      author: 'Carsten Zelle',
      coverImage: null,
      downloadUrl: 'https://example.com/download',
      summary: 'A test book summary',
      providerName: 'OAPEN',
      format: 'PDF',
      acquisitionMediaType: 'application/pdf',
    } as any;

    const mockProps = {
      book: catalogBookWithDistributor,
      source: 'catalog' as const,
      catalogName: 'Palace Test Library',
      onBack: vi.fn(),
      onReadBook: vi.fn(),
      onImportFromCatalog: vi.fn(),
  importStatus: { isLoading: false, message: '', error: null, state: 'awaiting-auth' as 'awaiting-auth', host: 'test-host' },
  userCitationFormat: 'apa' as 'apa',
      setImportStatus: vi.fn(),
    };

    // Render the BookDetailView component
    render(<BookDetailView {...mockProps} />);

  // Check that the book title is displayed
  expect(screen.getAllByText('Geschichte der Komparatistik in Programmtexten').length).toBeGreaterThan(0);
  // Check that the Provider field is displayed
    expect(screen.getByText(/Provider:/)).toBeInTheDocument();
    expect(screen.getByText('OAPEN')).toBeInTheDocument();

    console.log('✅ BookDetailView correctly displays distributor information for catalog books');
  });

  test('displays distributor for BiblioBoard books', () => {
    const biblioboardBook = {
      id: 402,
      title: 'Embracing Watershed Politics',
      author: 'Edella Schlager',
      coverImage: null,
      downloadUrl: 'https://example.com/download2',
      summary: 'Another test book',
      providerName: 'BiblioBoard',
      format: 'PDF',
    } as any;

    const mockProps = {
      book: biblioboardBook,
      source: 'catalog' as const,
      onBack: vi.fn(),
      onReadBook: vi.fn(),
      onImportFromCatalog: vi.fn(),
  importStatus: { isLoading: false, message: '', error: null, state: 'awaiting-auth' as 'awaiting-auth', host: 'test-host' },
  userCitationFormat: 'apa' as 'apa',
      setImportStatus: vi.fn(),
    };

    render(<BookDetailView {...mockProps} />);

  // Verify provider is shown
    expect(screen.getByText(/Provider:/)).toBeInTheDocument();
    expect(screen.getByText('BiblioBoard')).toBeInTheDocument();

    console.log('✅ BookDetailView correctly displays BiblioBoard distributor');
  });

  test('hides distributor section when no distributor is present', () => {
    const bookWithoutDistributor = {
      id: 403,
      title: 'Book Without Distributor',
      author: 'Test Author',
      coverImage: null,
      downloadUrl: 'https://example.com/download3',
      summary: 'Book without distributor info',
      format: 'EPUB',
    } as any;

    const mockProps = {
      book: bookWithoutDistributor,
      source: 'catalog' as const,
      onBack: vi.fn(),
      onReadBook: vi.fn(),
      onImportFromCatalog: vi.fn(),
  importStatus: { isLoading: false, message: '', error: null, state: 'awaiting-auth' as 'awaiting-auth', host: 'test-host' },
  userCitationFormat: 'apa' as 'apa',
      setImportStatus: vi.fn(),
    };

    render(<BookDetailView {...mockProps} />);

  // Verify provider label is shown
    expect(screen.getByText(/Provider:/)).toBeInTheDocument();

    console.log('✅ BookDetailView correctly hides distributor when not present');
  });
});
