import React, { createContext, useContext, useState, useRef, ReactNode } from 'react';
import ConfirmModal from './ConfirmModal';

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger';
  // optional undo callback: when provided, ConfirmProvider will call it after confirm and show an undo toast
  undoCallback?: () => Promise<void> | void;
  // optional duration in ms to allow undo
  undoDurationMs?: number;
};

type ConfirmFn = (opts: ConfirmOptions | string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export const ConfirmProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<ConfirmOptions>({ message: '' });
  const resolverRef = useRef<(v: boolean) => void>(() => {});
  const undoTimerRef = useRef<number | null>(null);
  const [undoVisible, setUndoVisible] = useState(false);
  const [undoLabel, setUndoLabel] = useState<string>('Undo');

  const confirm: ConfirmFn = (options) => {
    const normalized: ConfirmOptions = typeof options === 'string' ? { message: options } : options;
    setOpts({ ...normalized });
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  };

  const handleClose = () => {
    setOpen(false);
    resolverRef.current(false);
  };

  const handleConfirm = () => {
    setOpen(false);
    resolverRef.current(true);
    // if an undo callback is provided, call it and show undo toast
    if (opts && typeof opts.undoCallback === 'function') {
      try {
        // Call callback but don't await by default; show undo UI
        const maybePromise = opts.undoCallback();
        // show undo toast
        setUndoVisible(true);
        setUndoLabel('Undo');
        const duration = opts.undoDurationMs ?? 6000;
        if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
        undoTimerRef.current = window.setTimeout(() => {
          setUndoVisible(false);
          undoTimerRef.current = null;
        }, duration) as unknown as number;
        // swallow promise
        if (maybePromise && typeof (maybePromise as any).then === 'function') {
          (maybePromise as Promise<void>).catch(() => { /* ignore */ });
        }
      } catch (e) {
        console.warn('undoCallback failed', e);
      }
    }
  };

  const handleUndo = async () => {
    // hide toast and clear timer
    setUndoVisible(false);
    if (undoTimerRef.current) {
      window.clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
    try {
      if (opts && typeof opts.undoCallback === 'function') {
        await opts.undoCallback();
      }
    } catch (e) {
      console.error('Undo action failed', e);
    }
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmModal
        isOpen={open}
        title={opts.title || 'Confirm'}
        message={opts.message}
        confirmLabel={opts.confirmLabel || 'Confirm'}
        cancelLabel={opts.cancelLabel || 'Cancel'}
        variant={opts.variant || 'default'}
        onClose={handleClose}
        onConfirm={handleConfirm}
      />
      {/* Undo toast */}
      {undoVisible && (
        <div className="fixed bottom-6 right-6 z-60">
          <div className="bg-slate-900 text-white rounded-md shadow-lg px-4 py-2 flex items-center gap-4">
            <div className="text-sm">Action performed</div>
            <button onClick={handleUndo} className="text-sky-300 underline text-sm">{undoLabel}</button>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};

export const useConfirm = (): ConfirmFn => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within a ConfirmProvider');
  return ctx;
};

export default ConfirmContext;
