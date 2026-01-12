// BookDetailView test fixtures
export const catalogBook = {
  id: 101,
  title: 'OAPEN Catalog Book',
  author: 'Test Author',
  coverImage: null,
  downloadUrl: 'https://example.com/download',
  summary: 'A book from the OAPEN catalog',
  distributor: 'OAPEN',
  providerId: 'oapen-123',
  providerName: 'OAPEN Library',
  format: 'EPUB',
  acquisitionMediaType: 'application/epub+zip',
};

export const pdfCatalogBook = {
  id: 102,
  title: 'PDF from BiblioBoard',
  author: 'PDF Author',
  coverImage: null,
  downloadUrl: 'https://example.com/download.pdf',
  summary: 'A PDF book',
  distributor: 'BiblioBoard',
  providerId: 'biblio-789',
  providerName: 'BiblioBoard',
  format: 'PDF',
  acquisitionMediaType: 'application/pdf',
};

export const libraryBook = {
  id: 1,
  title: 'My Library Book',
  author: 'Test Author',
  coverImage: null,
  providerId: 'lib-456',
  providerName: 'My Local Library',
  distributor: 'OAPEN',
  format: 'EPUB',
};

export const defaultImportStatus = { isLoading: false, message: '', error: null, state: 'awaiting-auth' as 'awaiting-auth', host: 'test-host' };
