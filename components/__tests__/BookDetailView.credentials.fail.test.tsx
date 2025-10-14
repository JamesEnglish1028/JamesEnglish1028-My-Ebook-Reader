import React, { useState } from 'react';

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { describe, it, vi, beforeEach, afterEach, expect } from 'vitest';

import * as opds from '../../services/opds';
import * as opds2 from '../../services/opds2';
import type { CatalogBook } from '../../types';
import BookDetailView from '../BookDetailView';
import OpdsCredentialsModal from '../OpdsCredentialsModal';

describe('BookDetailView when stored credentials fail', () => {
  let origFetch: any;
  beforeEach(() => { origFetch = (globalThis as any).fetch; });
  afterEach(() => { (globalThis as any).fetch = origFetch; vi.restoreAllMocks(); });

  it('shows credential modal when stored creds fail and unauthenticated attempt returns authDocument', async () => {
    const user = userEvent.setup();

    const stored = { host: 'opds.example', username: 'stored-user', password: 'stored-pass' };
    vi.spyOn(opds2, 'findCredentialForUrl').mockReturnValue(stored as any);

    // First call with stored creds fails with authDocument error
    const authDoc = { title: 'Login', links: [{ href: 'https://auth.example', rel: 'authenticate' }] };
    vi.spyOn(opds, 'resolveAcquisitionChainOpds1')
      .mockImplementationOnce(async (_href: string, _creds: any) => { const e: any = new Error('auth required'); e.status = 401; e.authDocument = authDoc; throw e; })
      .mockImplementationOnce(async (_href: string, _creds: any) => { const e: any = new Error('auth required'); e.status = 401; e.authDocument = authDoc; throw e; });

    const TestHarness: React.FC = () => {
      const [importStatus, setImportStatus] = useState({ isLoading: false, message: '', error: null as string | null });

      const handleImportFromCatalog = async (book: CatalogBook) => {
        return { success: false };
      };

      const sample: CatalogBook = { title: 'Auth Book', author: 'A', coverImage: null, downloadUrl: 'https://opds.example/borrow/1', summary: null, providerId: 'p1', format: 'EPUB', acquisitionMediaType: 'application/adobe+epub' };

      return (
        <div>
          <BookDetailView book={sample} source="catalog" onBack={() => {}} onReadBook={() => {}} onImportFromCatalog={handleImportFromCatalog} importStatus={importStatus} setImportStatus={setImportStatus} />
          <OpdsCredentialsModal isOpen={false} host={null} onClose={() => {}} onSubmit={() => {}} />
        </div>
      );
    };

    render(<TestHarness />);

    const addButton = screen.getByRole('button', { name: /Read in Palace App|Add to Bookshelf/i });
    await user.click(addButton);

    // Credential modal should appear (BookDetailView will set credModalOpen)
    // Check for the provider auth CTA which is shown in the modal
    await waitFor(() => expect(screen.getByRole('button', { name: /Open sign-in page/i })).toBeInTheDocument());
  });
});
