import React from 'react';
import { useFocusTrap } from '../hooks';
import { CloseIcon, TrashIcon } from './icons';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  bookTitle: string;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({ isOpen, onClose, onConfirm, bookTitle }) => {
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
          <h2 className="text-xl font-bold text-red-400 flex items-center gap-2">
            <TrashIcon className="w-6 h-6" />
            Confirm Deletion
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700 transition-colors" aria-label="Close">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>
        
        <p className="text-slate-300 mb-6 text-sm">
          Are you sure you want to permanently delete "<strong className="font-semibold text-slate-100">{bookTitle}</strong>"? This action cannot be undone.
        </p>

        <div className="flex justify-end gap-4">
           <button
            onClick={onClose}
            className="py-2 px-4 rounded-md bg-slate-600 hover:bg-slate-500 transition-colors font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="py-2 px-6 rounded-md bg-red-600 hover:bg-red-700 transition-colors font-bold"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;
