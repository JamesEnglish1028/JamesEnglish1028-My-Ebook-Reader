import React from 'react';

import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';

import { resolveAcquisitionChainOpds1 } from '../../services/opds';
import BookDetailView from '../BookDetailView';
import { ToastProvider } from '../toast/ToastContext';
import ToastStack from '../toast/ToastStack';

// Mock services
vi.mock('../../services/opds', () => ({
  resolveAcquisitionChainOpds1: vi.fn(),
}));

const sampleCatalogBook = {
  title: 'Proxy Test Book',
  author: 'Tester',
  coverImage: null,
  downloadUrl: 'https://corsproxy.io/https://example.com/opds/acq',
  providerName: 'ExampleProvider',
  acquisitionMediaType: 'application/adobe+epub',
};

describe('BookDetailView proxy toast', () => {
  test('shows toast when OPDS1 resolver throws proxyUsed error', async () => {
    // Make the mocked resolver throw an error with proxyUsed === true
    (resolveAcquisitionChainOpds1 as any).mockImplementation(async () => {
      const err: any = new Error('Proxy blocked request');
      err.proxyUsed = true;
      err.status = 502;
      throw err;
    });

    const onImportFromCatalog = vi.fn(async () => ({ success: false }));
    const onBack = vi.fn();
    const onReadBook = vi.fn();

    render(
      <ToastProvider>
        <BookDetailView
          book={sampleCatalogBook as any}
          source="catalog"
          catalogName="TestCatalog"
          onBack={onBack}
          onReadBook={onReadBook}
          onImportFromCatalog={onImportFromCatalog}
          importStatus={{ isLoading: false, message: '', error: null }}
          setImportStatus={() => {}}
        />
        <ToastStack />
      </ToastProvider>,
    );

    // Click the palace-style action button (labelled "Read in Palace App")
    const btn = screen.getByRole('button', { name: /read in palace app/i });
    await act(async () => userEvent.click(btn));

    // Expect the toast message to appear
    expect(await screen.findByText(/Borrow failed through public CORS proxy/i)).toBeInTheDocument();

    // Cleanup mock
    (resolveAcquisitionChainOpds1 as any).mockReset();
  });
});
