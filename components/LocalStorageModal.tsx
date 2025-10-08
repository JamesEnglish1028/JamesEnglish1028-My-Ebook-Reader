import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { CloseIcon, TrashIcon } from './icons';
import { useConfirm } from './ConfirmContext';

interface LocalStorageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LocalStorageModal: React.FC<LocalStorageModalProps> = ({ isOpen, onClose }) => {
  const [bookCount, setBookCount] = useState<number | null>(null);
  const confirm = useConfirm();
  
  useEffect(() => {
    if (isOpen) {
      db.getBooksMetadata().then(books => {
        setBookCount(books.length);
      }).catch(() => {
        setBookCount(0);
      });
    }
  }, [isOpen]);

  const handleClearLibrary = () => {
    (async () => {
      // Snapshot current library and localStorage keys managed by the app so we can restore on undo
      let snapshot: { books: any[]; localStorageEntries: Record<string, string | null> } = { books: [], localStorageEntries: {} };
      try {
        snapshot.books = await db.getAllBooks();
        Object.keys(localStorage)
          .filter(key => key.startsWith('ebook-reader-'))
          .forEach(key => { snapshot.localStorageEntries[key] = localStorage.getItem(key); });
      } catch (e) {
        console.warn('Failed to snapshot library before clear', e);
      }

      const ok = await confirm({
        message: 'DANGER: This will permanently delete your entire local library, including all books, bookmarks, and citations.\n\nYou will have a short window to undo this action.',
        title: 'Dangerous Operation',
        confirmLabel: 'Yes, delete',
        variant: 'danger',
        // undoCallback: when triggered, restore snapshot
        undoCallback: async () => {
          try {
            if (snapshot.books && snapshot.books.length > 0) {
              for (const b of snapshot.books) {
                // best-effort restore
                await db.saveBook(b);
              }
            }
            Object.entries(snapshot.localStorageEntries || {}).forEach(([k, v]) => {
              if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v as string);
            });
            // Reload to apply restored state
            setTimeout(() => window.location.reload(), 200);
          } catch (err) {
            console.error('Failed to restore library on undo', err);
          }
        },
        undoDurationMs: 8000,
      });

      if (!ok) return;

      // Clear all app-related localStorage items
      Object.keys(localStorage)
          .filter(key => key.startsWith('ebook-reader-'))
          .forEach(key => localStorage.removeItem(key));

      db.clearAllBooks().then(() => {
        // Reload to apply changes and clear any in-memory state
        window.location.reload();
      });
    })();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose} aria-modal="true" role="dialog">
      <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-lg p-6 text-white" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-sky-300">Local Storage Management</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700 transition-colors" aria-label="Close">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>
        
        <div className="space-y-6">
          <div className="bg-slate-900/50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2 text-slate-200">Library Statistics</h3>
            <p className="text-sm text-slate-400">
              Your library is stored locally in your browser's IndexedDB.
            </p>
            <div className="mt-4">
              <span className="font-semibold text-slate-300">Books in Library: </span>
              <span className="font-bold text-sky-300 text-lg">
                {bookCount === null ? 'Loading...' : bookCount}
              </span>
            </div>
          </div>
          
          <div className="bg-slate-900/50 p-4 rounded-lg border border-red-500/30">
            <h3 className="text-lg font-semibold mb-2 text-red-400">Danger Zone</h3>
            <p className="text-sm text-slate-400 mb-4">
              This will permanently delete all books and associated data (bookmarks, citations, reading progress) from your browser. This action cannot be undone.
            </p>
            <button
              onClick={handleClearLibrary}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-md bg-red-600 hover:bg-red-700 transition-colors font-semibold text-white text-sm"
            >
              <TrashIcon className="w-5 h-5" />
              <span>Clear Entire Local Library</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocalStorageModal;
