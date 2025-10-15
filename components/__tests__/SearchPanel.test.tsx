import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SearchResult } from '../../domain/reader/types';
import SearchPanel from '../SearchPanel';

describe('SearchPanel', () => {
  let baseProps: any;
  beforeEach(() => {
    baseProps = {
      isOpen: true,
      onClose: vi.fn(),
      onQueryChange: vi.fn(),
      onNavigate: vi.fn(),
      results: [] as SearchResult[],
      isLoading: false,
      searchQuery: '',
    };
  });

  it('renders nothing when isOpen is false', () => {
    render(<SearchPanel {...baseProps} isOpen={false} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders the search panel and input', () => {
    render(<SearchPanel {...baseProps} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search in book...')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(<SearchPanel {...baseProps} />);
    fireEvent.click(screen.getByLabelText(/close search/i));
    expect(baseProps.onClose).toHaveBeenCalled();
  });

  it('calls onQueryChange when typing in input', () => {
    render(<SearchPanel {...baseProps} />);
    fireEvent.change(screen.getByPlaceholderText('Search in book...'), { target: { value: 'test' } });
    expect(baseProps.onQueryChange).toHaveBeenCalledWith('test');
  });

  it('shows loading spinner when isLoading is true', () => {
    render(<SearchPanel {...baseProps} isLoading searchQuery="foo" />);
    expect(screen.getByText(/searching/i)).toBeInTheDocument();
  });

  it('shows results when present', () => {
    const results: SearchResult[] = [
      { cfi: 'cfi1', excerpt: 'This is a test excerpt with the word test.' },
      { cfi: 'cfi2', excerpt: 'Another result for testing.' },
    ];
    render(<SearchPanel {...baseProps} results={results} searchQuery="test" />);
    expect(screen.getByText(/2 results? found/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button').length).toBeGreaterThan(1); // result buttons + close
  });

  it('shows no results message when searchQuery is set but results is empty', () => {
    render(<SearchPanel {...baseProps} searchQuery="foobar" results={[]} />);
    expect(screen.getByText(/no results found/i)).toBeInTheDocument();
  });

  it('shows prompt when no searchQuery', () => {
    render(<SearchPanel {...baseProps} searchQuery="" results={[]} />);
    expect(screen.getByText(/enter a term above/i)).toBeInTheDocument();
  });

  it('calls onNavigate when a result is clicked', () => {
    const results: SearchResult[] = [
      { cfi: 'cfi1', excerpt: 'This is a test excerpt with the word test.' },
    ];
    render(<SearchPanel {...baseProps} results={results} searchQuery="test" />);
    const resultButton = screen.getAllByRole('button').find(btn => btn !== screen.getByLabelText(/close search/i));
    if (resultButton) {
      fireEvent.click(resultButton);
      expect(baseProps.onNavigate).toHaveBeenCalledWith('cfi1');
    }
  });

  it('highlights the search query in results', () => {
    const results: SearchResult[] = [
      { cfi: 'cfi1', excerpt: 'Highlight the word highlight in this excerpt.' },
    ];
    render(<SearchPanel {...baseProps} results={results} searchQuery="highlight" />);
    const highlights = screen.getAllByText(/highlight/i);
    // At least one of the matches should be a <strong>
    expect(highlights.some(el => el.tagName === 'STRONG')).toBe(true);
  });
});
