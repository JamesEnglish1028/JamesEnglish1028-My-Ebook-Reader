// Mock URL.revokeObjectURL for jsdom
globalThis.URL.revokeObjectURL = vi.fn();
// Mock URL.createObjectURL for jsdom
globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
// Mock ResizeObserver for jsdom
class ResizeObserverMock {
  observe() { }
  unobserve() { }
  disconnect() { }
}
globalThis.ResizeObserver = ResizeObserverMock;
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import PdfReaderView from '../PdfReaderView';

// Mock react-router-dom hooks
vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: '1' }),
  useNavigate: () => vi.fn(),
}));

// Mock db and readerUtils
vi.mock('../../services/db', () => ({
  db: {
    get: vi.fn().mockResolvedValue({
      id: 1,
      title: 'Test PDF',
      author: 'Test Author',
      publisher: 'Test Publisher',
      publicationDate: '2025-10-15',
      cover: '',
      file: '',
      opdsId: '',
      distributor: '',
      format: 'pdf',
    }),
    getBook: vi.fn().mockResolvedValue({
      id: 1,
      title: 'Test PDF',
      author: 'Test Author',
      publisher: 'Test Publisher',
      publicationDate: '2025-10-15',
      cover: '',
      file: '',
      opdsId: '',
      distributor: '',
      format: 'PDF',
    }),
  },
}));
vi.mock('../../services/readerUtils', () => ({
  getReaderSettings: () => ({ fontSize: 100, theme: 'dark', flow: 'paginated', citationFormat: 'apa', fontFamily: 'Original', readAloud: { voiceURI: '', rate: 1, pitch: 1 } }),
  getBookmarksForBook: vi.fn().mockResolvedValue([]),
  getCitationsForBook: vi.fn().mockResolvedValue([]),
  saveBookmarksForBook: vi.fn(),
  saveCitationsForBook: vi.fn(),
  getLastPositionForBook: vi.fn().mockResolvedValue(null),
  saveLastPositionForBook: vi.fn(),
  getPdfViewStateForBook: vi.fn().mockResolvedValue(null),
  savePdfViewStateForBook: vi.fn(),
}));

// Mock react-pdf (Document and Page)
vi.mock('react-pdf', () => ({
  Document: ({ children }: any) => <div data-testid="pdf-document">{children}</div>,
  Page: ({ pageNumber }: any) => <div data-testid={`pdf-page-${pageNumber}`}>Page {pageNumber}</div>,
  pdfjs: { GlobalWorkerOptions: { workerSrc: '' } },
}));

// Mock ConfirmContext
vi.mock('../ConfirmContext', () => ({
  useConfirm: () => vi.fn(),
}));

describe('PdfReaderView', () => {
  beforeAll(() => {
    // Silence Suspense fallback warnings
    vi.spyOn(console, 'error').mockImplementation(() => { });
  });

  it('renders loading spinner initially', () => {
    render(<PdfReaderView bookId={1} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders PDF document after loading', async () => {
    render(<PdfReaderView bookId={1} />);
    await waitFor(() => expect(screen.getByTestId('pdf-document')).toBeInTheDocument());
  });

  it('shows error message if book not found', async () => {
    // Override db.get to reject
    const { db } = await import('../../services/db');
    (db.getBook as unknown as import('vitest').Mock).mockRejectedValueOnce(new Error('Book not found'));
    render(<PdfReaderView bookId={999} />);
    await waitFor(() => expect(screen.getByText(/book not found/i)).toBeInTheDocument());
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    render(<PdfReaderView bookId={1} onClose={onClose} />);
    await waitFor(() => expect(screen.getByTestId('pdf-document')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText(/close/i));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows navigation panel when TOC button is clicked', async () => {
    render(<PdfReaderView bookId={1} />);
    await waitFor(() => expect(screen.getByTestId('pdf-document')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText(/contents/i));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });
});
