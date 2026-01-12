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

describe('BookDetailView Distributor as Provider Integration', () => {
  afterEach(() => {
    cleanup();
  });

  test('displays distributor as provider name for catalog books', () => {
    const catalogBookWithDistributor = {
      id: 201,
      title: 'Test OAPEN Book',
      author: 'Test Author',
      coverImage: null,
      downloadUrl: 'https://example.com/download',
      summary: 'A test book from OAPEN',
      distributor: 'OAPEN',
      providerId: 'test-123',
      providerName: 'OAPEN',
      format: 'PDF',
    } as any;

    const mockProps = {
      book: catalogBookWithDistributor,
      source: 'catalog' as const,
      onBack: vi.fn(),
      onReadBook: vi.fn(),
      onImportFromCatalog: vi.fn(),
  importStatus: { isLoading: false, message: '', error: null, state: 'awaiting-auth' as 'awaiting-auth', host: 'test-host' },
  userCitationFormat: 'apa' as 'apa',
      setImportStatus: vi.fn(),
    };

    render(<BookDetailView {...mockProps} />);

    // Should show Provider section with distributor as provider name
    expect(screen.getByText(/Provider:/)).toBeInTheDocument();
    expect(screen.getByText('OAPEN')).toBeInTheDocument();

    console.log('✅ Catalog book shows distributor as provider name');
  });

  test('displays providerName for library books', () => {
    const libraryBookWithProvider = {
      id: 1,
      title: 'Test Library Book',
      author: 'Test Author',
      coverImage: null,
      providerId: 'lib-456',
      providerName: 'My Library Provider',
      distributor: 'OAPEN',
      format: 'EPUB',
    } as any;

    const mockProps = {
      book: libraryBookWithProvider,
      source: 'library' as const,
      onBack: vi.fn(),
      onReadBook: vi.fn(),
      onImportFromCatalog: vi.fn(),
  importStatus: { isLoading: false, message: '', error: null, state: 'awaiting-auth' as 'awaiting-auth', host: 'test-host' },
  userCitationFormat: 'apa' as 'apa',
      setImportStatus: vi.fn(),
    };

    render(<BookDetailView {...mockProps} />);

  // Should show Provider section with providerName
    expect(screen.getByText(/Provider:/)).toBeInTheDocument();
    expect(screen.getByText('My Library Provider')).toBeInTheDocument();
  // Should NOT show distributor separately since it's a library book
  expect(screen.queryByText('OAPEN')).not.toBeInTheDocument();

    console.log('✅ Library book shows providerName, not distributor');
  });

  test('handles catalog books without distributor gracefully', () => {
    const catalogBookWithoutDistributor = {
      id: 202,
      title: 'Book Without Distributor',
      author: 'Test Author',
      coverImage: null,
      downloadUrl: 'https://example.com/download',
      summary: 'Book without distributor',
      providerId: 'no-dist-123',
      providerName: 'Imported locally',
      format: 'EPUB',
    } as any;

    const mockProps = {
      book: catalogBookWithoutDistributor,
      source: 'catalog' as const,
      onBack: vi.fn(),
      onReadBook: vi.fn(),
      onImportFromCatalog: vi.fn(),
  importStatus: { isLoading: false, message: '', error: null, state: 'awaiting-auth' as 'awaiting-auth', host: 'test-host' },
  userCitationFormat: 'apa' as 'apa',
      setImportStatus: vi.fn(),
    };

    render(<BookDetailView {...mockProps} />);

    // Should show Provider section but no distributor
    expect(screen.getByText(/Provider:/)).toBeInTheDocument();
    // Should NOT show distributor
    expect(screen.queryByText('OAPEN')).not.toBeInTheDocument();

    console.log('✅ Catalog book without distributor handled gracefully');
  });
});
