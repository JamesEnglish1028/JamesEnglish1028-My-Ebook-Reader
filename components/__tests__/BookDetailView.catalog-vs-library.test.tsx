import { render, screen, cleanup } from '@testing-library/react';
import { describe, test, expect, vi, afterEach } from 'vitest';

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
    const catalogBook: CatalogBook = {
      title: 'OAPEN Catalog Book',
      author: 'Test Author',
      coverImage: null,
      downloadUrl: 'https://example.com/download',
      summary: 'A book from the OAPEN catalog',
      distributor: 'OAPEN',
      providerId: 'oapen-123',
      format: 'EPUB',
      acquisitionMediaType: 'application/epub+zip',
    };

    const mockProps = {
      book: catalogBook,
      source: 'catalog' as const, // This is the key - source is 'catalog'
      catalogName: 'OAPEN Library',
      onBack: vi.fn(),
      onReadBook: vi.fn(),
      onImportFromCatalog: vi.fn(),
      importStatus: { isLoading: false, message: '', error: null },
      setImportStatus: vi.fn(),
    };

    render(<BookDetailView {...mockProps} />);

    // Should show catalog-specific UI elements
    expect(screen.getByText('Return to Catalog')).toBeInTheDocument();
    expect(screen.getByText('Add to Bookshelf')).toBeInTheDocument();
    
    // Should show distributor information in Provider ID section
    expect(screen.getByText('Provider ID')).toBeInTheDocument();
    expect(screen.getByText('oapen-123')).toBeInTheDocument();
    expect(screen.getByText('from OAPEN')).toBeInTheDocument();
    
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
    };

    const mockProps = {
      book: libraryBook,
      source: 'library' as const, // This is the key - source is 'library'
      onBack: vi.fn(),
      onReadBook: vi.fn(),
      onImportFromCatalog: vi.fn(),
      importStatus: { isLoading: false, message: '', error: null },
      setImportStatus: vi.fn(),
    };

    render(<BookDetailView {...mockProps} />);

    // Should show library-specific UI elements
    expect(screen.getByText('Return to My Library')).toBeInTheDocument();
    expect(screen.getByText('Read Book')).toBeInTheDocument();
    
    // Should show providerName (not distributor) in Provider ID section
    expect(screen.getByText('Provider ID')).toBeInTheDocument();
    expect(screen.getByText('lib-456')).toBeInTheDocument();
    expect(screen.getByText('from My Local Library')).toBeInTheDocument();
    
    // Should NOT show the distributor info since it's a library book
    expect(screen.queryByText('from OAPEN')).not.toBeInTheDocument();
    
    console.log('✅ Library book detail view shows providerName, not distributor');
  });

  test('catalog PDF book shows Cannot Import PDF button', () => {
    const pdfCatalogBook: CatalogBook = {
      title: 'PDF from BiblioBoard',
      author: 'PDF Author',
      coverImage: null,
      downloadUrl: 'https://example.com/download.pdf',
      summary: 'A PDF book',
      distributor: 'BiblioBoard',
      providerId: 'biblio-789',
      format: 'PDF',
      acquisitionMediaType: 'application/pdf',
    };

    const mockProps = {
      book: pdfCatalogBook,
      source: 'catalog' as const,
      onBack: vi.fn(),
      onReadBook: vi.fn(),
      onImportFromCatalog: vi.fn(),
      importStatus: { isLoading: false, message: '', error: null },
      setImportStatus: vi.fn(),
    };

    render(<BookDetailView {...mockProps} />);

    // Should show PDF-specific disabled button
    expect(screen.getByText('Cannot Import PDF')).toBeInTheDocument();
    
    // But should still show distributor info
    expect(screen.getByText('from BiblioBoard')).toBeInTheDocument();
    
    console.log('✅ PDF catalog book shows Cannot Import but still shows distributor');
  });
});