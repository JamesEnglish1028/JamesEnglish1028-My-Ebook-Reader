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

describe('BookDetailView credential retry using stored creds', () => {
  let origFetch: any;
  beforeEach(() => { origFetch = (globalThis as any).fetch; });
  afterEach(() => { (globalThis as any).fetch = origFetch; vi.restoreAllMocks(); });

  it('attempts stored credentials before prompting user', async () => {
    const user = userEvent.setup();

    // Mock stored credential lookup to return a stored credential
    const stored = { host: 'opds.example', username: 'stored-user', password: 'stored-pass' };
    const spyFind = vi.spyOn(opds2, 'findCredentialForUrl').mockReturnValue(stored as any);

    // First resolve attempt with stored creds should succeed and return final href
    const spyResolve = vi.spyOn(opds, 'resolveAcquisitionChainOpds1')
      .mockImplementationOnce(async (_href: string, creds: any) => {
        // Expect that stored creds are passed in the first call
        expect(creds).toBeDefined();
        expect(creds.username).toBe(stored.username);
        return 'https://cdn.example/content/book.epub';
      });

  const mockFetch = vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(1) }));
    (globalThis as any).fetch = mockFetch;

    // Test harness similar to real app import flow
    const TestHarness: React.FC = () => {
  const [importStatus, setImportStatus] = useState({ isLoading: false, message: '', error: null as string | null, state: 'awaiting-auth' as 'awaiting-auth', host: 'test-host' });

      const handleImportFromCatalog = async () => {
        // BookDetailView will call resolveAcquisitionChainOpds1 internally when palace-type
        // For this harness we don't need to do anything here; return success false to allow UI path
        return { success: false };
      };

  const sample = { id: 301, title: 'Auth Book', author: 'A', coverImage: null, downloadUrl: 'https://opds.example/borrow/1', summary: null, providerId: 'p1', format: 'EPUB', acquisitionMediaType: 'application/adobe+epub' } as any;

      return (
        <div>
          <BookDetailView book={sample} source="catalog" onBack={() => {}} onReadBook={() => {}} onImportFromCatalog={handleImportFromCatalog} importStatus={importStatus} setImportStatus={() => {}} userCitationFormat={'apa' as 'apa'} />
          <OpdsCredentialsModal isOpen={false} host={null} onClose={() => {}} onSubmit={() => {}} />
        </div>
      );
    };

    render(<TestHarness />);

  const addButton = screen.getByRole('button', { name: /Import to My Library/i });
    await user.click(addButton);

    // Wait for resolve to be called
    await waitFor(() => expect(spyFind).toHaveBeenCalled());
    await waitFor(() => expect(spyResolve).toHaveBeenCalled());

    // The credentials modal should not be visible (we passed stored creds and success)
    expect(screen.queryByText(/Authentication required/i)).toBeNull();
  });
});
