import React from 'react';
import { CloseIcon } from './icons';

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onClose: () => void;
  onConfirm: () => void;
  variant?: 'default' | 'danger';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, title = 'Confirm', message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', onClose, onConfirm, variant = 'default' }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose} role="dialog" aria-modal="true">
      <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-md p-6 text-white" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className={`text-xl font-bold ${variant === 'danger' ? 'text-red-300' : 'text-sky-300'}`}>{title}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700 transition-colors" aria-label="Close">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>
        <p className="text-slate-300 mb-6 text-sm">{message}</p>
        <div className="flex justify-end gap-4">
          <button onClick={onClose} className="py-2 px-4 rounded-md bg-slate-600 hover:bg-slate-500 transition-colors font-semibold">{cancelLabel}</button>
          <button onClick={onConfirm} className={`py-2 px-6 rounded-md transition-colors font-bold ${variant === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-sky-500 hover:bg-sky-600'}`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
