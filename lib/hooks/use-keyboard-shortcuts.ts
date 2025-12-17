'use client';

import { useEffect, useCallback, useRef } from 'react';

type KeyboardModifier = 'ctrl' | 'meta' | 'shift' | 'alt';
type KeyCombination = string; // e.g., 'ctrl+k', 'shift+enter', 'g d'

interface ShortcutHandler {
  key: KeyCombination;
  handler: (e: KeyboardEvent) => void;
  description?: string;
  when?: () => boolean; // Condition for when shortcut is active
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  preventDefault?: boolean;
  stopPropagation?: boolean;
}

// Parse a key combination string like 'ctrl+k' or 'meta+shift+p'
function parseKeyCombination(combo: string): {
  modifiers: Set<KeyboardModifier>;
  key: string;
  isSequence: boolean;
  sequence: string[];
} {
  const parts = combo.toLowerCase().split('+');
  const modifiers = new Set<KeyboardModifier>();
  let key = '';

  // Check if it's a sequence (e.g., 'g d')
  if (combo.includes(' ')) {
    return {
      modifiers: new Set(),
      key: '',
      isSequence: true,
      sequence: combo.split(' '),
    };
  }

  for (const part of parts) {
    if (['ctrl', 'control'].includes(part)) {
      modifiers.add('ctrl');
    } else if (['meta', 'cmd', 'command'].includes(part)) {
      modifiers.add('meta');
    } else if (part === 'shift') {
      modifiers.add('shift');
    } else if (part === 'alt') {
      modifiers.add('alt');
    } else {
      key = part;
    }
  }

  return { modifiers, key, isSequence: false, sequence: [] };
}

// Check if modifiers match
function modifiersMatch(e: KeyboardEvent, modifiers: Set<KeyboardModifier>): boolean {
  const hasCtrl = modifiers.has('ctrl') === e.ctrlKey;
  const hasMeta = modifiers.has('meta') === e.metaKey;
  const hasShift = modifiers.has('shift') === e.shiftKey;
  const hasAlt = modifiers.has('alt') === e.altKey;

  // For cross-platform, treat ctrl and meta as interchangeable for certain shortcuts
  if (modifiers.has('ctrl') || modifiers.has('meta')) {
    return (e.ctrlKey || e.metaKey) && hasShift && hasAlt;
  }

  return hasCtrl && hasMeta && hasShift && hasAlt;
}

// Global shortcuts hook
export function useKeyboardShortcuts(
  shortcuts: ShortcutHandler[],
  options: UseKeyboardShortcutsOptions = {}
) {
  const { enabled = true, preventDefault = true, stopPropagation = false } = options;
  const sequenceBuffer = useRef<string[]>([]);
  const sequenceTimeout = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if in input/textarea/contenteditable
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Allow escape to work in inputs
        if (e.key !== 'Escape') return;
      }

      for (const shortcut of shortcuts) {
        // Check condition
        if (shortcut.when && !shortcut.when()) continue;

        const parsed = parseKeyCombination(shortcut.key);

        if (parsed.isSequence) {
          // Handle key sequences (e.g., 'g d')
          sequenceBuffer.current.push(e.key.toLowerCase());

          // Clear sequence after timeout
          if (sequenceTimeout.current) {
            clearTimeout(sequenceTimeout.current);
          }
          sequenceTimeout.current = setTimeout(() => {
            sequenceBuffer.current = [];
          }, 1000);

          // Check if sequence matches
          const currentSequence = sequenceBuffer.current.join(' ');
          if (currentSequence === shortcut.key) {
            if (preventDefault) e.preventDefault();
            if (stopPropagation) e.stopPropagation();
            shortcut.handler(e);
            sequenceBuffer.current = [];
            return;
          }
        } else {
          // Handle key combinations (e.g., 'ctrl+k')
          const keyMatches = e.key.toLowerCase() === parsed.key;
          const modifiersMatching = modifiersMatch(e, parsed.modifiers);

          if (keyMatches && modifiersMatching) {
            if (preventDefault) e.preventDefault();
            if (stopPropagation) e.stopPropagation();
            shortcut.handler(e);
            return;
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (sequenceTimeout.current) {
        clearTimeout(sequenceTimeout.current);
      }
    };
  }, [shortcuts, enabled, preventDefault, stopPropagation]);
}

// Common shortcuts presets
export const commonShortcuts = {
  // Navigation
  goToDashboard: (handler: () => void): ShortcutHandler => ({
    key: 'g d',
    handler,
    description: 'Go to Dashboard',
  }),
  goToSites: (handler: () => void): ShortcutHandler => ({
    key: 'g s',
    handler,
    description: 'Go to Sites',
  }),
  goToDeadlines: (handler: () => void): ShortcutHandler => ({
    key: 'g l',
    handler,
    description: 'Go to Deadlines',
  }),
  goToEvidence: (handler: () => void): ShortcutHandler => ({
    key: 'g e',
    handler,
    description: 'Go to Evidence',
  }),
  goToPacks: (handler: () => void): ShortcutHandler => ({
    key: 'g p',
    handler,
    description: 'Go to Packs',
  }),

  // Actions
  openSearch: (handler: () => void): ShortcutHandler => ({
    key: 'ctrl+k',
    handler,
    description: 'Open Command Palette',
  }),
  upload: (handler: () => void): ShortcutHandler => ({
    key: 'ctrl+shift+u',
    handler,
    description: 'Upload',
  }),
  save: (handler: () => void): ShortcutHandler => ({
    key: 'ctrl+s',
    handler,
    description: 'Save',
  }),

  // List navigation
  nextItem: (handler: () => void): ShortcutHandler => ({
    key: 'j',
    handler,
    description: 'Next item',
  }),
  prevItem: (handler: () => void): ShortcutHandler => ({
    key: 'k',
    handler,
    description: 'Previous item',
  }),
  selectItem: (handler: () => void): ShortcutHandler => ({
    key: 'x',
    handler,
    description: 'Select/deselect item',
  }),
  openItem: (handler: () => void): ShortcutHandler => ({
    key: 'enter',
    handler,
    description: 'Open item',
  }),

  // Common
  escape: (handler: () => void): ShortcutHandler => ({
    key: 'escape',
    handler,
    description: 'Close/Cancel',
  }),
  help: (handler: () => void): ShortcutHandler => ({
    key: 'shift+/',
    handler,
    description: 'Show help',
  }),
};

// Hook for list keyboard navigation
export function useListKeyboardNav<T>(
  items: T[],
  onSelect: (item: T) => void,
  options: {
    enabled?: boolean;
    loop?: boolean;
  } = {}
) {
  const { enabled = true, loop = true } = options;
  const selectedIndex = useRef(0);

  const next = useCallback(() => {
    if (items.length === 0) return;
    if (loop) {
      selectedIndex.current = (selectedIndex.current + 1) % items.length;
    } else {
      selectedIndex.current = Math.min(selectedIndex.current + 1, items.length - 1);
    }
  }, [items.length, loop]);

  const prev = useCallback(() => {
    if (items.length === 0) return;
    if (loop) {
      selectedIndex.current = (selectedIndex.current - 1 + items.length) % items.length;
    } else {
      selectedIndex.current = Math.max(selectedIndex.current - 1, 0);
    }
  }, [items.length, loop]);

  const selectCurrent = useCallback(() => {
    if (items[selectedIndex.current]) {
      onSelect(items[selectedIndex.current]);
    }
  }, [items, onSelect]);

  useKeyboardShortcuts(
    [
      commonShortcuts.nextItem(next),
      commonShortcuts.prevItem(prev),
      commonShortcuts.openItem(selectCurrent),
    ],
    { enabled }
  );

  return {
    selectedIndex: selectedIndex.current,
    next,
    prev,
    selectCurrent,
  };
}
