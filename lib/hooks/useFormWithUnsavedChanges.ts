'use client';

/**
 * useFormWithUnsavedChanges Hook
 *
 * Tracks form dirty state and prevents navigation when there are unsaved changes.
 * Features:
 * - Tracks if form has unsaved changes
 * - Shows browser warning when trying to close/refresh with unsaved changes
 * - Intercepts Next.js navigation with custom confirmation dialog
 * - Provides methods to manually mark form as dirty/clean
 * - Integrates seamlessly with react-hook-form
 *
 * @example
 * ```tsx
 * const { formState } = useForm();
 * const { isDirty, setDirty, resetDirty } = useFormWithUnsavedChanges({
 *   isDirty: formState.isDirty,
 *   message: 'You have unsaved changes. Are you sure you want to leave?'
 * });
 * ```
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export interface UseFormWithUnsavedChangesOptions {
  /**
   * Whether the form has unsaved changes
   * Typically from react-hook-form's formState.isDirty
   */
  isDirty?: boolean;

  /**
   * Custom message to display in the confirmation dialog
   * @default 'You have unsaved changes. Are you sure you want to leave?'
   */
  message?: string;

  /**
   * Whether to enable the warning
   * @default true
   */
  enabled?: boolean;

  /**
   * Callback when user confirms navigation despite unsaved changes
   */
  onConfirmNavigation?: () => void;

  /**
   * Callback when navigation is cancelled
   */
  onCancelNavigation?: () => void;
}

export interface UseFormWithUnsavedChangesReturn {
  /**
   * Current dirty state of the form
   */
  isDirty: boolean;

  /**
   * Manually set the form as dirty
   */
  setDirty: () => void;

  /**
   * Manually reset the dirty state
   */
  resetDirty: () => void;

  /**
   * Programmatically navigate (bypasses warning)
   */
  navigateWithoutWarning: (url: string) => void;
}

export function useFormWithUnsavedChanges({
  isDirty: externalIsDirty = false,
  message = 'You have unsaved changes. Are you sure you want to leave?',
  enabled = true,
  onConfirmNavigation,
  onCancelNavigation,
}: UseFormWithUnsavedChangesOptions = {}): UseFormWithUnsavedChangesReturn {
  const [internalIsDirty, setInternalIsDirty] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const shouldWarnRef = useRef(true);

  // Combine external and internal dirty states
  const isDirty = externalIsDirty || internalIsDirty;

  // Handle browser beforeunload event (refresh, close tab, etc.)
  useEffect(() => {
    if (!enabled || !isDirty) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty && shouldWarnRef.current) {
        e.preventDefault();
        // Modern browsers ignore custom messages and show a generic one
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty, message, enabled]);

  // Handle Next.js navigation
  useEffect(() => {
    if (!enabled) return;

    // Store original push method
    const originalPush = router.push;

    // Override router.push to show confirmation
    const wrappedPush = (url: string, options?: any) => {
      if (isDirty && shouldWarnRef.current) {
        const confirmed = window.confirm(message);

        if (confirmed) {
          onConfirmNavigation?.();
          // Temporarily disable warning to allow navigation
          shouldWarnRef.current = false;
          originalPush.call(router, url, options);
          // Re-enable after a short delay
          setTimeout(() => {
            shouldWarnRef.current = true;
          }, 100);
        } else {
          onCancelNavigation?.();
        }
      } else {
        originalPush.call(router, url, options);
      }
    };

    // Replace router.push with wrapped version
    (router as any).push = wrappedPush;

    return () => {
      // Restore original push method on cleanup
      (router as any).push = originalPush;
    };
  }, [isDirty, message, router, enabled, onConfirmNavigation, onCancelNavigation]);

  // Intercept browser back/forward buttons
  useEffect(() => {
    if (!enabled || !isDirty) return;

    const handlePopState = (e: PopStateEvent) => {
      if (isDirty && shouldWarnRef.current) {
        const confirmed = window.confirm(message);

        if (!confirmed) {
          // Push a new state to prevent navigation
          window.history.pushState(null, '', pathname);
          onCancelNavigation?.();
        } else {
          onConfirmNavigation?.();
        }
      }
    };

    // Push initial state
    window.history.pushState(null, '', pathname);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isDirty, message, pathname, enabled, onConfirmNavigation, onCancelNavigation]);

  const setDirty = useCallback(() => {
    setInternalIsDirty(true);
  }, []);

  const resetDirty = useCallback(() => {
    setInternalIsDirty(false);
  }, []);

  const navigateWithoutWarning = useCallback((url: string) => {
    shouldWarnRef.current = false;
    router.push(url);
    // Re-enable after navigation
    setTimeout(() => {
      shouldWarnRef.current = true;
    }, 100);
  }, [router]);

  return {
    isDirty,
    setDirty,
    resetDirty,
    navigateWithoutWarning,
  };
}

export default useFormWithUnsavedChanges;
