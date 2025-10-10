import React from 'react';
import { useToast } from './ToastContext';
import './toast.css';

const ToastStack: React.FC = () => {
  const { toasts, removeToast } = useToast();

  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="true">
      {toasts.map((t, idx) => (
        <div key={t.id} className={`toast-item toast-item-${idx}`} role="status">
          <div className="toast-body">{t.message}</div>
          {t.actionLabel && typeof t.action === 'function' ? (
            <button className="toast-close" onClick={() => { try { t.action && t.action(); } finally { removeToast(t.id); } }}>{t.actionLabel}</button>
          ) : (
            <button className="toast-close" aria-label="Close" onClick={() => removeToast(t.id)}>×</button>
          )}
        </div>
      ))}
    </div>
  );
};

export default ToastStack;
