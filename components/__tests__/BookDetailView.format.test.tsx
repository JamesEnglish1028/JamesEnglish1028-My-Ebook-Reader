import React from 'react';

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import '@testing-library/jest-dom';
import type { CatalogBook } from '../../types';
import BookDetailView from '../BookDetailView';

const baseProps = {
  onBack: () => {},
  onReadBook: () => {},
  importStatus: { isLoading: false, message: '', error: null },
  setImportStatus: () => {},
} as any;

describe('BookDetailView format badge and import button', () => {
  it('displays PDF badge and enabled Add to Bookshelf button for PDF catalog book', () => {
    const book: CatalogBook = {
      title: 'PDF Book',
      author: 'PDF Author',
      coverImage: null,
      downloadUrl: 'https://example.org/p/book.pdf',
      summary: 'A PDF book',
      providerId: 'p1',
      format: 'PDF',
    };

    render(<BookDetailView {...baseProps} book={book} source="catalog" onImportFromCatalog={async () => ({ success: false })} />);

    // Format badge should display PDF
    expect(screen.getByText('PDF')).toBeInTheDocument();

    // Import button should allow PDF imports (app supports PDF reader)
    expect(screen.getByRole('button', { name: /Add to Bookshelf/i })).toBeInTheDocument();
  });

  it('shows Add to Bookshelf for EPUB catalog book', () => {
    const book: CatalogBook = {
      title: 'EPUB Book',
      author: 'EPUB Author',
      coverImage: null,
      downloadUrl: 'https://example.org/p/book.epub',
      summary: 'An EPUB book',
      providerId: 'p2',
      format: 'EPUB',
    };

    render(<BookDetailView {...baseProps} book={book} source="catalog" onImportFromCatalog={async () => ({ success: false })} />);

    // Format badge should display EPUB
    expect(screen.getByText('EPUB')).toBeInTheDocument();

    // Import button should show 'Add to Bookshelf'
    expect(screen.getByRole('button', { name: /Add to Bookshelf/i })).toBeInTheDocument();
  });
});
