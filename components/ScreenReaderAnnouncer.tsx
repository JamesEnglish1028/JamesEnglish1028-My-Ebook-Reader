import React, { useEffect, useState } from 'react';

interface ScreenReaderAnnouncerProps {
  /**
   * Message to announce to screen readers
   */
  message: string | null;
  /**
   * Politeness level for aria-live
   * - 'polite': Waits for user to pause (default, recommended for most updates)
   * - 'assertive': Interrupts user immediately (use sparingly for critical updates)
   */
  politeness?: 'polite' | 'assertive';
  /**
   * Clear message after this duration (ms). Default: 5000ms
   */
  clearAfter?: number;
  /**
   * Callback when message is cleared
   */
  onClear?: () => void;
}

/**
 * ScreenReaderAnnouncer Component
 *
 * A utility component for announcing dynamic content updates to screen readers.
 * Uses aria-live regions to notify screen reader users of important changes
 * without moving focus or disrupting the user's current task.
 *
 * Best Practices:
 * - Use 'polite' for most updates (waits for user to pause)
 * - Use 'assertive' only for critical errors or urgent information
 * - Keep messages concise and clear
 * - Avoid announcing every minor change
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const [status, setStatus] = useState<string | null>(null);
 *
 *   const handleImport = async () => {
 *     setStatus('Importing book...');
 *     await importBook();
 *     setStatus('Book imported successfully');
 *   };
 *
 *   return (
 *     <>
 *       <button onClick={handleImport}>Import Book</button>
 *       <ScreenReaderAnnouncer message={status} />
 *     </>
 *   );
 * }
 * ```
 */
const ScreenReaderAnnouncer: React.FC<ScreenReaderAnnouncerProps> = ({
  message,
  politeness = 'polite',
  clearAfter = 5000,
  onClear,
}) => {
  const [displayMessage, setDisplayMessage] = useState<string | null>(null);

  useEffect(() => {
    if (message) {
      setDisplayMessage(message);

      // Clear message after duration
      if (clearAfter > 0) {
        const timer = setTimeout(() => {
          setDisplayMessage(null);
          if (onClear) onClear();
        }, clearAfter);

        return () => clearTimeout(timer);
      }
    } else {
      setDisplayMessage(null);
    }
  }, [message, clearAfter, onClear]);

  if (!displayMessage) return null;

  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {displayMessage}
    </div>
  );
};

export default ScreenReaderAnnouncer;
