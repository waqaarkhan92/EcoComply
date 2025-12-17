'use client';

import { useEffect, useRef, useState } from 'react';

interface LiveRegionProps {
  /** The message to announce to screen readers */
  message: string;
  /**
   * Politeness level:
   * - 'polite': waits for current speech to complete (default)
   * - 'assertive': interrupts current speech immediately
   */
  politeness?: 'polite' | 'assertive';
  /** Whether to also show the message visually (for debugging/testing) */
  visible?: boolean;
  /** Clear the message after this many milliseconds (default: 5000) */
  clearAfter?: number;
}

/**
 * LiveRegion Component
 *
 * Announces dynamic content changes to screen readers using ARIA live regions.
 * Use this for:
 * - Form submission results
 * - Loading/loaded states
 * - Search result counts
 * - Toast-like notifications for screen readers
 *
 * @example
 * <LiveRegion message={isLoading ? "Loading..." : `${count} results found`} />
 */
export function LiveRegion({
  message,
  politeness = 'polite',
  visible = false,
  clearAfter = 5000,
}: LiveRegionProps) {
  const [currentMessage, setCurrentMessage] = useState('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Update message (this triggers screen reader announcement)
    setCurrentMessage(message);

    // Clear message after delay to prevent re-reading on re-render
    if (message && clearAfter > 0) {
      timeoutRef.current = setTimeout(() => {
        setCurrentMessage('');
      }, clearAfter);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [message, clearAfter]);

  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className={visible ? 'p-2 bg-gray-100 rounded text-sm' : 'sr-only'}
    >
      {currentMessage}
    </div>
  );
}

/**
 * useLiveAnnouncer hook
 *
 * Provides a function to announce messages to screen readers imperatively.
 * Useful for announcing the result of user actions.
 *
 * @example
 * const announce = useLiveAnnouncer();
 *
 * const handleDelete = async () => {
 *   await deleteItem();
 *   announce('Item deleted successfully');
 * };
 */
export function useLiveAnnouncer() {
  const [message, setMessage] = useState('');
  const [key, setKey] = useState(0);

  const announce = (text: string) => {
    // Force a new key to ensure the message is re-announced even if identical
    setKey((prev) => prev + 1);
    setMessage(text);
  };

  return {
    announce,
    Announcer: () => <LiveRegion key={key} message={message} />,
  };
}

/**
 * RouteAnnouncer Component
 *
 * Announces route changes for screen readers.
 * Place this in your root layout.
 *
 * Note: Next.js 14+ has built-in route announcements,
 * so this is mainly for custom announcements or older versions.
 */
export function RouteAnnouncer({ title }: { title: string }) {
  const [announced, setAnnounced] = useState('');

  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timeout = setTimeout(() => {
      setAnnounced(`Navigated to ${title}`);
    }, 100);

    return () => clearTimeout(timeout);
  }, [title]);

  return <LiveRegion message={announced} />;
}
