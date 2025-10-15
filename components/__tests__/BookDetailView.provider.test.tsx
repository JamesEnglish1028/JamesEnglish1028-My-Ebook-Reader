import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';

import type { BookMetadata, CatalogBook } from '../../types';
import BookDetailView from '../BookDetailView';

// Mock the ToastContext
const mockUseToast = vi.fn(() => ({
  showToast: vi.fn(),
}));

vi.mock('../toast/ToastContext', () => ({
  useToast: () => mockUseToast(),
}));

describe('BookDetailView Distributor as Provider Integration', () => {
  afterEach(() => {
    cleanup();
  });

  test('displays distributor as provider name for catalog books', () => {
    const catalogBookWithDistributor: CatalogBook = {
      title: 'Test OAPEN Book',
      author: 'Test Author',
      coverImage: null,
      downloadUrl: 'https://example.com/download',
      summary: 'A test book from OAPEN',
      distributor: 'OAPEN', // This should show as provider
      providerId: 'test-123',
      format: 'PDF',
    };

    const mockProps = {
      book: catalogBookWithDistributor,
      source: 'catalog' as const,
      onBack: vi.fn(),
      onReadBook: vi.fn(),
      onImportFromCatalog: vi.fn(),
      importStatus: { isLoading: false, message: '', error: null },
      setImportStatus: vi.fn(),
    };

    render(<BookDetailView {...mockProps} />);

    // Should show Provider ID section with distributor as provider name
    expect(screen.getByText('Provider ID')).toBeInTheDocument();
    expect(screen.getByText('test-123')).toBeInTheDocument();
    expect(screen.getByText('from OAPEN')).toBeInTheDocument();

    console.log('✅ Catalog book shows distributor as provider name');
  });

  test('displays providerName for library books', () => {
    const libraryBookWithProvider: BookMetadata = {
      id: 1,
      title: 'Test Library Book',
      author: 'Test Author',
      coverImage: null,
      providerId: 'lib-456',
      providerName: 'My Library Provider',
      distributor: 'OAPEN', // Library books should use providerName, not distributor
      format: 'EPUB',
    };

    const mockProps = {
      book: libraryBookWithProvider,
      source: 'library' as const,
      onBack: vi.fn(),
      onReadBook: vi.fn(),
      onImportFromCatalog: vi.fn(),
      importStatus: { isLoading: false, message: '', error: null },
      setImportStatus: vi.fn(),
    };

    render(<BookDetailView {...mockProps} />);

    // Should show Provider ID section with providerName (not distributor)
    expect(screen.getByText('Provider ID')).toBeInTheDocument();
    expect(screen.getByText('lib-456')).toBeInTheDocument();
    expect(screen.getByText('from My Library Provider')).toBeInTheDocument();

    // Should NOT show distributor separately since it's a library book
    expect(screen.queryByText('from OAPEN')).not.toBeInTheDocument();

    console.log('✅ Library book shows providerName, not distributor');
  });

  test('handles catalog books without distributor gracefully', () => {
    const catalogBookWithoutDistributor: CatalogBook = {
      title: 'Book Without Distributor',
      author: 'Test Author',
      coverImage: null,
      downloadUrl: 'https://example.com/download',
      summary: 'Book without distributor',
      providerId: 'no-dist-123',
      format: 'EPUB',
    };

    const mockProps = {
      book: catalogBookWithoutDistributor,
      source: 'catalog' as const,
      onBack: vi.fn(),
      onReadBook: vi.fn(),
      onImportFromCatalog: vi.fn(),
      importStatus: { isLoading: false, message: '', error: null },
      setImportStatus: vi.fn(),
    };

    render(<BookDetailView {...mockProps} />);

    // Should show Provider ID but no "from" text since no distributor
    expect(screen.getByText('Provider ID')).toBeInTheDocument();
    expect(screen.getByText('no-dist-123')).toBeInTheDocument();
    expect(screen.queryByText(/from/)).not.toBeInTheDocument();

    console.log('✅ Catalog book without distributor handled gracefully');
  });
});
