import React, { useEffect, useRef } from 'react';

import { PlusIcon, MinusIcon, AdjustmentsVerticalIcon } from './icons';
import Tooltip from './Tooltip';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  // Optional handlers for contextual actions (PDF or EPUB)
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onToggleFit?: () => void;
  // If true, indicates the active reader is EPUB (so zoom adjusts font-size)
  activeReader?: 'epub' | 'pdf' | null;
}

const ShortcutHelpModal: React.FC<Props> = ({ isOpen, onClose, onZoomIn, onZoomOut, onToggleFit, activeReader = null }) => {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousActiveRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previousActiveRef.current = document.activeElement;

    // Move focus into the dialog
    const focusable = getFocusableElements(dialogRef.current);
    const first = focusable[0] as HTMLElement | undefined;
    (first || closeButtonRef.current)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab') {
        // focus trap
        const elements = getFocusableElements(dialogRef.current);
        if (elements.length === 0) {
          e.preventDefault();
          return;
        }
        const firstEl = elements[0] as HTMLElement;
        const lastEl = elements[elements.length - 1] as HTMLElement;

        if (e.shiftKey) {
          if (document.activeElement === firstEl) {
            e.preventDefault();
            lastEl.focus();
          }
        } else {
          if (document.activeElement === lastEl) {
            e.preventDefault();
            firstEl.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      // restore focus
      try { (previousActiveRef.current as HTMLElement | null)?.focus(); } catch (e) { /* ignore */ }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center" role="presentation">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcut-help-title"
        className="relative bg-slate-800 text-white rounded-lg shadow-lg max-w-lg w-full mx-4 p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2">
          <h3 id="shortcut-help-title" className="text-lg font-bold">Keyboard Shortcuts</h3>
          <button ref={closeButtonRef} onClick={onClose} className="p-2 rounded hover:bg-slate-700" aria-label="Close help">Close</button>
        </div>
        <ul className="space-y-2 text-sm">
          <li><strong>← / →</strong> — Previous / Next page</li>
          <li><strong>Space</strong> — Next page</li>
          <li className="flex items-center justify-between">
            <div><strong>+</strong> / <strong>-</strong> — Zoom in / out</div>
            <div className="flex gap-2">
              <Tooltip label="Zoom out">
                <button onClick={onZoomOut} className="p-3 rounded-full bg-slate-700 hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500" aria-label="Zoom out">
                  <MinusIcon className="w-5 h-5 text-slate-50" />
                </button>
              </Tooltip>
              <Tooltip label="Zoom in">
                <button onClick={onZoomIn} className="p-3 rounded-full bg-slate-700 hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500" aria-label="Zoom in">
                  <PlusIcon className="w-5 h-5 text-slate-50" />
                </button>
              </Tooltip>
            </div>
          </li>
          <li className="flex items-center justify-between">
            <div><strong>F</strong> — Toggle Fit Width / Fit Page</div>
            <div>
              <Tooltip label="Toggle fit">
                <button onClick={onToggleFit} className="p-3 rounded-full bg-slate-700 hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500" aria-label="Toggle fit mode">
                  <AdjustmentsVerticalIcon className="w-5 h-5 text-slate-50" />
                </button>
              </Tooltip>
            </div>
          </li>
          <li><strong>C</strong> — Open/Close contents & bookmarks</li>
          <li><strong>B</strong> — Add a quick bookmark for current page</li>
          <li><strong>?</strong> — Toggle this help</li>
        </ul>
        <div className="mt-4 text-xs text-slate-400">Tip: When typing into inputs the shortcuts are disabled.</div>
      </div>
    </div>
  );
};

function getFocusableElements(root: Element | null) {
  if (!root) return [] as Element[];
  const nodes = root.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
  );
  return Array.from(nodes).filter((n) => n.offsetWidth > 0 || n.offsetHeight > 0);
}

export default ShortcutHelpModal;
