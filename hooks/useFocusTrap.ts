import { useEffect, useRef, useCallback } from 'react';

export interface FocusTrapOptions {
  /**
   * Whether the focus trap is active
   */
  isActive: boolean;
  /**
   * Initial element to focus (if not provided, focuses first focusable element)
   */
  initialFocusRef?: React.RefObject<HTMLElement>;
  /**
   * Element to return focus to when trap is deactivated
   */
  returnFocusRef?: React.RefObject<HTMLElement>;
  /**
   * Callback when Escape key is pressed
   */
  onEscape?: () => void;
}

/**
 * Hook to trap focus within a container (e.g., modal dialog)
 * Implements WCAG 2.1 focus management for modal dialogs
 * 
 * @example
 * ```tsx
 * function Modal({ isOpen, onClose }) {
 *   const modalRef = useFocusTrap({
 *     isActive: isOpen,
 *     onEscape: onClose
 *   });
 * 
 *   return (
 *     <div ref={modalRef} role="dialog" aria-modal="true">
 *       {content}
 *     </div>
 *   );
 * }
 * ```
 */
export function useFocusTrap<T extends HTMLElement = HTMLElement>(options: FocusTrapOptions) {
  const { isActive, initialFocusRef, returnFocusRef, onEscape } = options;
  const containerRef = useRef<T>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  // Get all focusable elements within container
  const getFocusableElements = useCallback((container: HTMLElement): HTMLElement[] => {
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable]'
    ].join(',');

    const elements = Array.from(container.querySelectorAll<HTMLElement>(focusableSelectors));
    return elements.filter(el => {
      // Filter out hidden elements
      return el.offsetParent !== null && getComputedStyle(el).visibility !== 'hidden';
    });
  }, []);

  // Handle Tab key to trap focus
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!containerRef.current) return;

    // Handle Escape key
    if (event.key === 'Escape' && onEscape) {
      event.preventDefault();
      onEscape();
      return;
    }

    // Handle Tab key for focus trap
    if (event.key === 'Tab') {
      const focusableElements = getFocusableElements(containerRef.current);
      
      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      // Shift+Tab on first element -> focus last element
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
        return;
      }

      // Tab on last element -> focus first element
      if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
        return;
      }
    }
  }, [getFocusableElements, onEscape]);

  // Activate focus trap
  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    // Save currently focused element to restore later
    previouslyFocusedElement.current = document.activeElement as HTMLElement;

    // Focus initial element or first focusable element
    const focusableElements = getFocusableElements(containerRef.current);
    
    if (initialFocusRef?.current) {
      initialFocusRef.current.focus();
    } else if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);

      // Restore focus to previously focused element
      if (returnFocusRef?.current) {
        returnFocusRef.current.focus();
      } else if (previouslyFocusedElement.current) {
        previouslyFocusedElement.current.focus();
      }
    };
  }, [isActive, initialFocusRef, returnFocusRef, getFocusableElements, handleKeyDown]);

  return containerRef;
}

/**
 * Hook to manage focus restoration when navigating between views
 * Saves focus position before navigation and restores it when returning
 * 
 * @example
 * ```tsx
 * function BookList() {
 *   const { saveFocus, restoreFocus } = useFocusManagement('book-list');
 * 
 *   const handleBookClick = (bookId: string) => {
 *     saveFocus();
 *     navigate(`/book/${bookId}`);
 *   };
 * 
 *   useEffect(() => {
 *     restoreFocus();
 *   }, []);
 * 
 *   return <div>{books}</div>;
 * }
 * ```
 */
export function useFocusManagement(key: string) {
  const focusMapRef = useRef<Map<string, string>>(new Map());

  const saveFocus = useCallback(() => {
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement?.id) {
      focusMapRef.current.set(key, activeElement.id);
    }
  }, [key]);

  const restoreFocus = useCallback(() => {
    const savedId = focusMapRef.current.get(key);
    if (savedId) {
      const element = document.getElementById(savedId);
      if (element) {
        element.focus();
      }
      focusMapRef.current.delete(key);
    }
  }, [key]);

  return { saveFocus, restoreFocus };
}
