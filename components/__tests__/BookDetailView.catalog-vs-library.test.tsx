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

describe('Catalog vs Library BookDetailView Differences', () => {
  afterEach(() => {
    cleanup();
  });

  test('catalog book shows Add to Bookshelf button and distributor as provider', () => {
    // This simulates exactly what happens when you click a book from a catalog
    const catalogBook = {
      id: 101,
      title: 'OAPEN Catalog Book',
      author: 'Test Author',
      coverImage: null,
      downloadUrl: 'https://example.com/download',
      summary: 'A book from the OAPEN catalog',
      distributor: 'OAPEN',
      providerId: 'oapen-123',
      format: 'EPUB',
      acquisitionMediaType: 'application/epub+zip',
    } as any;

    const mockProps = {
  book: catalogBook,
  source: 'catalog' as const, // This is the key - source is 'catalog'
  catalogName: 'OAPEN Library',
  onBack: vi.fn(),
  onReadBook: vi.fn(),
  onImportFromCatalog: vi.fn(),
  importStatus: { isLoading: false, message: '', error: null, state: 'awaiting-auth' as 'awaiting-auth', host: 'test-host' },
  setImportStatus: vi.fn(),
  userCitationFormat: 'apa',
    };

    render(<BookDetailView {...mockProps} />);

    // Should show catalog-specific UI elements
    expect(screen.getByText('Return to Catalog')).toBeInTheDocument();
  expect(screen.getByText('Import to My Library')).toBeInTheDocument();

  // Should show provider information
  expect(screen.getByText('Provider')).toBeInTheDocument();
  expect(screen.getByText('OAPEN Library')).toBeInTheDocument();

    console.log('✅ Catalog book detail view shows distributor as provider');
  });

  test('library book shows Read Book button and providerName', () => {
    // This simulates what happens when you click a book from your library
    const libraryBook = {
      id: 1,
      title: 'My Library Book',
      author: 'Test Author',
      coverImage: null,
      providerId: 'lib-456',
      providerName: 'My Local Library',
      distributor: 'OAPEN', // Library books have distributor but should use providerName
      format: 'EPUB',
    } as any;

    const mockProps = {
  book: libraryBook,
  source: 'library' as const, // This is the key - source is 'library'
  onBack: vi.fn(),
  onReadBook: vi.fn(),
  onImportFromCatalog: vi.fn(),
  importStatus: { isLoading: false, message: '', error: null, state: 'awaiting-auth' as 'awaiting-auth', host: 'test-host' },
  setImportStatus: vi.fn(),
  userCitationFormat: 'apa',
    };

    render(<BookDetailView {...mockProps} />);

    // Should show library-specific UI elements
    expect(screen.getByText('Return to My Library')).toBeInTheDocument();
    expect(screen.getByText('Read Book')).toBeInTheDocument();

  // Should show provider information
  expect(screen.getByText('Provider')).toBeInTheDocument();
  expect(screen.getByText('My Local Library')).toBeInTheDocument();

  // Should NOT show the distributor info since it's a library book
  expect(screen.queryByText('OAPEN')).not.toBeInTheDocument();

    console.log('✅ Library book detail view shows providerName, not distributor');
  });

  test('catalog PDF book shows Add to Bookshelf button', () => {
    const pdfCatalogBook = {
      id: 102,
      title: 'PDF from BiblioBoard',
      author: 'PDF Author',
      coverImage: null,
      downloadUrl: 'https://example.com/download.pdf',
      summary: 'A PDF book',
      distributor: 'BiblioBoard',
      providerId: 'biblio-789',
      format: 'PDF',
      acquisitionMediaType: 'application/pdf',
    } as any;

    const mockProps = {
  book: pdfCatalogBook,
  source: 'catalog' as const,
  onBack: vi.fn(),
  onReadBook: vi.fn(),
  onImportFromCatalog: vi.fn(),
  importStatus: { isLoading: false, message: '', error: null, state: 'awaiting-auth' as 'awaiting-auth', host: 'test-host' },
  setImportStatus: vi.fn(),
  userCitationFormat: 'apa',
    };

    render(<BookDetailView {...mockProps} />);

    // PDF files should be importable (app supports PDF reader)
  expect(screen.getByText('Import to My Library')).toBeInTheDocument();

  // Should show provider information
  expect(screen.getByText('BiblioBoard')).toBeInTheDocument();

    console.log('✅ PDF catalog book shows Add to Bookshelf and distributor');
  });
});
