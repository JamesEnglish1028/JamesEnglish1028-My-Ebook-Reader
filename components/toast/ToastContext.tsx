import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

interface ToastItem { id: string; message: string; actionLabel?: string; action?: (() => void) }

interface ToastContextValue {
  toasts: ToastItem[];
  // message, ttl, optional action label and callback
  pushToast: (message: string, ttl?: number, actionLabel?: string, action?: (() => void)) => string;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Record<string, number>>({});

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    if (timers.current[id]) {
      try { window.clearTimeout(timers.current[id]); } catch (e) {}
      delete timers.current[id];
    }
  }, []);

  const pushToast = useCallback((message: string, ttl = 4000, actionLabel?: string, action?: (() => void)) => {
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
    setToasts(prev => [...prev, { id, message, actionLabel, action }]);
    const t = window.setTimeout(() => removeToast(id), ttl);
    timers.current[id] = t;
    return id;
  }, [removeToast]);

  // Cleanup on unmount
  useEffect(() => () => {
    Object.values(timers.current).forEach(t => { try { window.clearTimeout(t); } catch (e) {} });
    timers.current = {};
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, pushToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Safe fallback for tests or consumers rendered outside provider.
    return {
      toasts: [] as ToastItem[],
      pushToast: (message: string, ttl?: number, actionLabel?: string, action?: (() => void)) => {
        try { return `${Date.now().toString(36)}-noop`; } catch { return 'noop'; }
      },
      removeToast: (id: string) => {},
    } as ToastContextValue;
  }
  return ctx;
};
