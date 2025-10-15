import { useEffect, useCallback, useRef } from 'react';

export interface ShortcutAction {
  /**
   * Keyboard key (e.g., '?', '/', 'Escape', 'ArrowLeft')
   */
  key: string;
  /**
   * Description of what the shortcut does
   */
  description: string;
  /**
   * Category for grouping in help display
   */
  category?: 'global' | 'reader' | 'library' | 'navigation';
  /**
   * Callback function to execute
   */
  action: (event: KeyboardEvent) => void;
  /**
   * Whether to prevent default browser behavior
   */
  preventDefault?: boolean;
  /**
   * Whether Ctrl/Cmd key must be pressed
   */
  ctrl?: boolean;
  /**
   * Whether Shift key must be pressed
   */
  shift?: boolean;
  /**
   * Whether Alt/Option key must be pressed
   */
  alt?: boolean;
  /**
   * Whether shortcut is enabled (default: true)
   */
  enabled?: boolean;
}

export interface GlobalShortcutsOptions {
  /**
   * Array of shortcut definitions
   */
  shortcuts: ShortcutAction[];
  /**
   * Whether shortcuts are active (default: true)
   */
  enabled?: boolean;
  /**
   * Prevent shortcuts when typing in input fields (default: true)
   */
  preventInInputs?: boolean;
}

/**
 * Hook for managing global keyboard shortcuts
 * 
 * Provides a centralized way to register keyboard shortcuts with
 * conflict detection, modifier key support, and input field prevention.
 * 
 * @example
 * ```tsx
 * function App() {
 *   const [showHelp, setShowHelp] = useState(false);
 *   const [showSearch, setShowSearch] = useState(false);
 * 
 *   useGlobalShortcuts({
 *     shortcuts: [
 *       {
 *         key: '?',
 *         description: 'Show keyboard shortcuts',
 *         category: 'global',
 *         action: () => setShowHelp(true)
 *       },
 *       {
 *         key: '/',
 *         description: 'Open search',
 *         category: 'global',
 *         action: () => setShowSearch(true),
 *         preventDefault: true
 *       }
 *     ]
 *   });
 * 
 *   return <div>...</div>;
 * }
 * ```
 */
export function useGlobalShortcuts(options: GlobalShortcutsOptions) {
  const { shortcuts, enabled = true, preventInInputs = true } = options;
  const shortcutsRef = useRef(shortcuts);

  // Update shortcuts ref when they change
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Prevent shortcuts when typing in input fields (unless explicitly allowed)
      if (preventInInputs) {
        const target = event.target as HTMLElement;
        const tagName = target.tagName.toLowerCase();
        const isInput = tagName === 'input' || tagName === 'textarea' || target.isContentEditable;
        
        if (isInput) {
          return;
        }
      }

      // Find matching shortcut
      const matchingShortcut = shortcutsRef.current.find((shortcut) => {
        if (shortcut.enabled === false) return false;

        // Match key
        const keyMatches = event.key === shortcut.key;
        if (!keyMatches) return false;

        // Match modifiers
        const ctrlMatches = shortcut.ctrl ? (event.ctrlKey || event.metaKey) : !event.ctrlKey && !event.metaKey;
        const shiftMatches = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatches = shortcut.alt ? event.altKey : !event.altKey;

        return ctrlMatches && shiftMatches && altMatches;
      });

      if (matchingShortcut) {
        if (matchingShortcut.preventDefault) {
          event.preventDefault();
        }
        matchingShortcut.action(event);
      }
    },
    [enabled, preventInInputs]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);
}

/**
 * Hook to get all registered shortcuts for display in help
 * 
 * This is a companion hook to useGlobalShortcuts that allows
 * components to access the shortcut definitions for display purposes.
 * 
 * @example
 * ```tsx
 * function ShortcutHelp() {
 *   const shortcuts = useShortcutRegistry();
 *   
 *   return (
 *     <div>
 *       {shortcuts.map(s => (
 *         <div key={s.key}>
 *           <kbd>{s.key}</kbd> - {s.description}
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export const shortcutRegistry: ShortcutAction[] = [];

export function registerShortcut(shortcut: ShortcutAction) {
  // Check for conflicts
  const existing = shortcutRegistry.find(
    (s) => s.key === shortcut.key && s.ctrl === shortcut.ctrl && s.shift === shortcut.shift && s.alt === shortcut.alt
  );
  
  if (existing) {
    console.warn(`Shortcut conflict detected: ${shortcut.key} is already registered for "${existing.description}"`);
  }
  
  shortcutRegistry.push(shortcut);
}

export function unregisterShortcut(shortcut: ShortcutAction) {
  const index = shortcutRegistry.indexOf(shortcut);
  if (index > -1) {
    shortcutRegistry.splice(index, 1);
  }
}

export function getShortcutsByCategory(category?: string) {
  if (!category) return shortcutRegistry;
  return shortcutRegistry.filter((s) => s.category === category);
}

/**
 * Format a shortcut for display
 * 
 * @example
 * formatShortcut({ key: 's', ctrl: true }) // "Ctrl+S" or "⌘S" on Mac
 */
export function formatShortcut(shortcut: Pick<ShortcutAction, 'key' | 'ctrl' | 'shift' | 'alt'>): string {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().includes('MAC');
  const parts: string[] = [];

  if (shortcut.ctrl) {
    parts.push(isMac ? '⌘' : 'Ctrl');
  }
  if (shortcut.shift) {
    parts.push(isMac ? '⇧' : 'Shift');
  }
  if (shortcut.alt) {
    parts.push(isMac ? '⌥' : 'Alt');
  }

  // Format key name
  let keyName = shortcut.key;
  if (keyName === ' ') keyName = 'Space';
  else if (keyName === 'ArrowLeft') keyName = '←';
  else if (keyName === 'ArrowRight') keyName = '→';
  else if (keyName === 'ArrowUp') keyName = '↑';
  else if (keyName === 'ArrowDown') keyName = '↓';
  else if (keyName === 'Escape') keyName = 'Esc';

  parts.push(keyName);

  return parts.join(isMac ? '' : '+');
}
