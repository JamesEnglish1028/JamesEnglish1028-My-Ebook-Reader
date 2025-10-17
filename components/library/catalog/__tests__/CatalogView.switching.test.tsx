import React from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, act } from '@testing-library/react';
import { vi, describe, it, expect, afterEach } from 'vitest';

import * as hooks from '../../../../hooks';
import type { Catalog, CatalogRegistry } from '../../../../types';

// Provide a test wrapper that supplies minimal props and mocks
const initialCatalog: Catalog = {
  id: 'cat-1',
  name: 'Test Catalog',
  url: 'https://example.com/opds/catalog',
  opdsVersion: 'auto',
};

const registryCatalog: CatalogRegistry = {
  id: 'reg-1',
  name: 'Test Registry',
  url: 'https://example.com/opds/registry',
};

// Minimal stub for onShowBookDetail
const onShowBookDetail = vi.fn();

// Helper to render CatalogView with controlled props
// Create a single QueryClient for the test wrapper
const queryClient = new QueryClient();
function wrapWithProviders(node: React.ReactElement) {
  return <QueryClientProvider client={queryClient}>{node}</QueryClientProvider>;
}

function renderCatalogView(
  component: React.ComponentType<any>,
  activeOpdsSource: Catalog | CatalogRegistry,
  catalogNavPath: { name: string; url: string }[],
) {
  const Comp = component;
  return render(
    wrapWithProviders(
      <Comp
        activeOpdsSource={activeOpdsSource as any}
        catalogNavPath={catalogNavPath}
        setCatalogNavPath={() => {}}
        onShowBookDetail={onShowBookDetail}
        rootLevelCollections={[]}
        setRootLevelCollections={() => {}}
      />,
    ),
  );
}

describe('CatalogView - switching source clears display state while loading', () => {
  const useCatalogContentSpy = vi.spyOn(hooks as any, 'useCatalogContent');

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('clears catalog display arrays when switching active source and repopulates after load', async () => {
    // First render: content loaded with one book and one collection
    // Use mockImplementation so any early calls (during import/render) get this value
    useCatalogContentSpy.mockImplementation(() => ({
      data: {
        books: [
          { id: 'b1', title: 'Book 1', collections: [{ title: 'Col A', href: 'https://example.com/opds/collection/col-a' }], metadata: { 'title': 'Book 1' } },
        ],
        navLinks: [
          { title: 'Col A', url: 'https://example.com/opds/collection/col-a', rel: 'collection' },
        ],
        pagination: {},
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any));

    // Import the component after the spy is set up so the hook call can be intercepted
    const CatalogViewModule = await import('../CatalogView');
    const CatalogViewComp = CatalogViewModule.default;

    const { rerender } = renderCatalogView(CatalogViewComp, initialCatalog, [{ name: initialCatalog.name, url: initialCatalog.url }]);

    // Sanity: initial book and collection are rendered
    expect(await screen.findByText('Book 1')).toBeInTheDocument();
    expect(await screen.findByText('Col A')).toBeInTheDocument();

    // Next: simulate switching to a different registry where the new feed is still loading
    useCatalogContentSpy.mockReturnValueOnce({
      data: { books: [], navLinks: [], pagination: {} },
      isLoading: true, // simulate loading state for new source
      error: null,
      refetch: vi.fn(),
    } as any);

    // Rerender with new activeOpdsSource and nav path (loading)
    await act(async () => {
      rerender(
        <CatalogViewComp
          activeOpdsSource={registryCatalog as any}
          catalogNavPath={[{ name: registryCatalog.name, url: registryCatalog.url }]}
          setCatalogNavPath={() => {}}
          onShowBookDetail={onShowBookDetail}
          rootLevelCollections={[]}
          setRootLevelCollections={() => {}}
        />,
      );
    });

  // While loading, the previous book and collections should be removed
  expect(screen.queryByText('Book 1')).not.toBeInTheDocument();
  expect(screen.queryByText('Col A')).not.toBeInTheDocument();

  // And a loading indicator should be shown
  expect(await screen.findByText(/loading catalog/i)).toBeInTheDocument();

    // Finally: simulate the new feed finishing load with different content
    useCatalogContentSpy.mockReturnValueOnce({
      data: {
        books: [{ id: 'b2', title: 'Book 2', collections: [{ title: 'Col B', href: 'https://example.com/opds/collection/col-b' }], metadata: { 'title': 'Book 2' } }],
        navLinks: [
          { title: 'Col B', url: 'https://example.com/opds/collection/col-b', rel: 'collection' },
        ],
        pagination: {},
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    // Rerender again to reflect the loaded state
    await act(async () => {
      rerender(
        <CatalogViewComp
          activeOpdsSource={registryCatalog as any}
          catalogNavPath={[{ name: registryCatalog.name, url: registryCatalog.url }]}
          setCatalogNavPath={() => {}}
          onShowBookDetail={onShowBookDetail}
          rootLevelCollections={[]}
          setRootLevelCollections={() => {}}
        />,
      );
    });

  // New content should be present and loading indicator gone
  expect(await screen.findByText('Book 2')).toBeInTheDocument();
  expect(await screen.findByText('Col B')).toBeInTheDocument();
  expect(screen.queryByText(/loading catalog/i)).not.toBeInTheDocument();
  });
});
