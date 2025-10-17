import React, { useEffect, useRef, useState } from 'react';

import { useFocusTrap } from '../hooks';

import { CloseIcon } from './icons';

interface BookmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (note: string) => void;
}

const BookmarkModal: React.FC<BookmarkModalProps> = ({ isOpen, onClose, onSave }) => {
  const [note, setNote] = useState('');
  const charLimit = 200;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const modalRef = useFocusTrap<HTMLDivElement>({
    isActive: isOpen,
    initialFocusRef: textareaRef,
    onEscape: onClose,
  });

  useEffect(() => {
    if (isOpen) {
      setNote('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(note);
  };

  const remainingChars = charLimit - note.length;

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        ref={modalRef}
        className="bg-slate-800 rounded-lg shadow-xl w-full max-w-md p-6 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-sky-300">Add Bookmark</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700 transition-colors" aria-label="Close">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        <p className="text-slate-300 mb-4 text-sm">
          A bookmark for the current location will be created. You can add an optional note below.
        </p>

        <div>
          <label htmlFor="bookmark-note" className="block text-sm font-medium text-slate-400 mb-2">
            Note (optional)
          </label>
          <textarea
            ref={textareaRef}
            id="bookmark-note"
            rows={4}
            value={note}
            onChange={(e) => {
              if (e.target.value.length <= charLimit) {
                setNote(e.target.value);
              }
            }}
            className="w-full bg-slate-700 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            placeholder="Add a brief note..."
          />
          <p className={`text-xs mt-1 text-right ${remainingChars < 20 ? 'text-red-400' : 'text-slate-500'}`}>
            {remainingChars} characters remaining
          </p>
        </div>

        <div className="flex justify-end gap-4 mt-6">
          <button
            onClick={onClose}
            className="py-2 px-4 rounded-md bg-slate-600 hover:bg-slate-500 transition-colors font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="py-2 px-6 rounded-md bg-sky-500 hover:bg-sky-600 transition-colors font-bold"
          >
            Save Bookmark
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookmarkModal;
