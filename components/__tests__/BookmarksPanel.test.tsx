
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BookmarksPanel, { Bookmark } from '../BookmarksPanel';

describe('BookmarksPanel', () => {
  const bookmarks: Bookmark[] = [
    { id: '1', label: 'Chapter 1', cfi: 'epubcfi(/6/2[chapter1]!/4/1:0)', created: '2025-10-15T12:00:00Z' },
    { id: '2', label: 'Chapter 2', cfi: 'epubcfi(/6/4[chapter2]!/4/1:0)', created: '2025-10-15T12:05:00Z' },
  ];
  const onNavigate = vi.fn();
  const onDelete = vi.fn();
  const onClose = vi.fn();

  it('renders with bookmarks', () => {
    render(
      <BookmarksPanel
        bookmarks={bookmarks}
        onNavigate={onNavigate}
        onDelete={onDelete}
        isOpen={true}
        onClose={onClose}
      />
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Bookmarks')).toBeInTheDocument();
    expect(screen.getByText('Chapter 1')).toBeInTheDocument();
    expect(screen.getByText('Chapter 2')).toBeInTheDocument();
  });

  it('renders empty state', () => {
    render(
      <BookmarksPanel
        bookmarks={[]}
        onNavigate={onNavigate}
        onDelete={onDelete}
        isOpen={true}
        onClose={onClose}
      />
    );
    expect(screen.getByText(/no bookmarks/i)).toBeInTheDocument();
  });

  it('calls onNavigate when a bookmark is clicked', () => {
    render(
      <BookmarksPanel
        bookmarks={bookmarks}
        onNavigate={onNavigate}
        onDelete={onDelete}
        isOpen={true}
        onClose={onClose}
      />
    );
    fireEvent.click(screen.getByLabelText(/go to bookmark: chapter 1/i));
    expect(onNavigate).toHaveBeenCalledWith('epubcfi(/6/2[chapter1]!/4/1:0)');
  });

  it('calls onDelete when delete button is clicked', () => {
    render(
      <BookmarksPanel
        bookmarks={bookmarks}
        onNavigate={onNavigate}
        onDelete={onDelete}
        isOpen={true}
        onClose={onClose}
      />
    );
    fireEvent.click(screen.getByLabelText(/delete bookmark: chapter 2/i));
    expect(onDelete).toHaveBeenCalledWith('2');
  });

  it('calls onClose when close button is clicked', () => {
    render(
      <BookmarksPanel
        bookmarks={bookmarks}
        onNavigate={onNavigate}
        onDelete={onDelete}
        isOpen={true}
        onClose={onClose}
      />
    );
    fireEvent.click(screen.getByLabelText(/close bookmarks panel/i));
    expect(onClose).toHaveBeenCalled();
  });

  it('does not render when isOpen is false', () => {
    render(
      <BookmarksPanel
        bookmarks={bookmarks}
        onNavigate={onNavigate}
        onDelete={onDelete}
        isOpen={false}
        onClose={onClose}
      />
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
