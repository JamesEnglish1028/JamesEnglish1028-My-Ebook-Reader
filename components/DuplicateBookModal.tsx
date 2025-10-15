import React from 'react';
import { useFocusTrap } from '../hooks';
import { CloseIcon } from './icons';

interface DuplicateBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReplace: () => void;
  onAddAnyway: () => void;
  bookTitle: string;
}

const DuplicateBookModal: React.FC<DuplicateBookModalProps> = ({ isOpen, onClose, onReplace, onAddAnyway, bookTitle }) => {
  const modalRef = useFocusTrap<HTMLDivElement>({
    isActive: isOpen,
    onEscape: onClose
  });

  if (!isOpen) return null;

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
          <h2 className="text-xl font-bold text-yellow-300">Duplicate Book Found</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700 transition-colors" aria-label="Close">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        <p className="text-slate-300 mb-6 text-sm">
          The book "<strong className="font-semibold text-slate-100">{bookTitle}</strong>" is already in your library. What would you like to do?
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={onReplace}
            className="w-full py-2.5 px-4 rounded-md bg-sky-500 hover:bg-sky-600 transition-colors font-bold"
          >
            Replace Existing
          </button>
          <button
            onClick={onAddAnyway}
            className="w-full py-2.5 px-4 rounded-md bg-slate-600 hover:bg-slate-500 transition-colors font-semibold"
          >
            Add as New Copy
          </button>
          <button
            onClick={onClose}
            className="w-full py-2 px-4 text-sm text-slate-400 hover:text-white transition-colors"
          >
            Cancel Import
          </button>
        </div>
      </div>
    </div>
  );
};

export default DuplicateBookModal;
