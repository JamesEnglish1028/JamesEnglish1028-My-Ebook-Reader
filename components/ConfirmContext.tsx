import React, { createContext, useContext, useState, useRef, ReactNode } from 'react';
import { useToast } from './toast/ToastContext';
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
  const toast = useToast();

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
    // if an undo callback is provided, call it and show undo toast (via provider)
    if (opts && typeof opts.undoCallback === 'function') {
      try {
        const maybePromise = opts.undoCallback();
        const duration = opts.undoDurationMs ?? 6000;
        // push a toast with an action labeled 'Undo' that will call the callback
        toast.pushToast('Action performed', duration, 'Undo', async () => {
          try {
            if (maybePromise && typeof (maybePromise as any).then === 'function') {
              await maybePromise;
            } else {
              // If the callback isn't a promise, just invoke it again (best-effort)
              await (opts.undoCallback as () => any)();
            }
          } catch (e) {
            console.error('Undo action failed', e);
          }
        });
        if (maybePromise && typeof (maybePromise as any).then === 'function') {
          (maybePromise as Promise<void>).catch(() => { /* ignore */ });
        }
      } catch (e) {
        console.warn('undoCallback failed', e);
      }
    }
  };

  const handleUndo = async () => {
    // kept for compatibility; invoking the undo callback directly
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
      {/* Undo handled by toast provider */}
    </ConfirmContext.Provider>
  );
};

export const useConfirm = (): ConfirmFn => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within a ConfirmProvider');
  return ctx;
};

export default ConfirmContext;
