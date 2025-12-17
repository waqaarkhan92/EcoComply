import { useRef, useCallback, useEffect } from 'react';

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

interface SwipeConfig {
  /** Minimum distance in pixels to trigger a swipe (default: 50) */
  threshold?: number;
  /** Maximum time in ms for a swipe gesture (default: 300) */
  timeout?: number;
  /** Prevent default touch behavior (default: false) */
  preventDefault?: boolean;
}

interface TouchPoint {
  x: number;
  y: number;
  time: number;
}

/**
 * Hook for detecting swipe gestures on touch devices
 *
 * @example
 * const swipeRef = useSwipeGestures({
 *   onSwipeLeft: () => console.log('Swiped left'),
 *   onSwipeRight: () => handleComplete(),
 * });
 *
 * return <div ref={swipeRef}>Swipeable content</div>;
 */
export function useSwipeGestures<T extends HTMLElement = HTMLDivElement>(
  handlers: SwipeHandlers,
  config: SwipeConfig = {}
) {
  const { threshold = 50, timeout = 300, preventDefault = false } = config;

  const elementRef = useRef<T>(null);
  const startPoint = useRef<TouchPoint | null>(null);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      const touch = e.touches[0];
      startPoint.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };
    },
    []
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!startPoint.current) return;

      const touch = e.changedTouches[0];
      const endPoint = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };

      const deltaX = endPoint.x - startPoint.current.x;
      const deltaY = endPoint.y - startPoint.current.y;
      const deltaTime = endPoint.time - startPoint.current.time;

      // Check if gesture was quick enough
      if (deltaTime > timeout) {
        startPoint.current = null;
        return;
      }

      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      // Determine if it's a horizontal or vertical swipe
      if (absDeltaX > absDeltaY && absDeltaX > threshold) {
        // Horizontal swipe
        if (deltaX > 0) {
          handlers.onSwipeRight?.();
        } else {
          handlers.onSwipeLeft?.();
        }
        if (preventDefault) {
          e.preventDefault();
        }
      } else if (absDeltaY > absDeltaX && absDeltaY > threshold) {
        // Vertical swipe
        if (deltaY > 0) {
          handlers.onSwipeDown?.();
        } else {
          handlers.onSwipeUp?.();
        }
        if (preventDefault) {
          e.preventDefault();
        }
      }

      startPoint.current = null;
    },
    [handlers, threshold, timeout, preventDefault]
  );

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: !preventDefault });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchEnd, preventDefault]);

  return elementRef;
}

/**
 * Hook for detecting long press on touch devices
 *
 * @example
 * const longPressRef = useLongPress(() => {
 *   openContextMenu();
 * }, { delay: 500 });
 *
 * return <div ref={longPressRef}>Long press me</div>;
 */
export function useLongPress<T extends HTMLElement = HTMLDivElement>(
  callback: () => void,
  config: { delay?: number } = {}
) {
  const { delay = 500 } = config;

  const elementRef = useRef<T>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);

  // Keep callback ref up to date
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const handleTouchStart = useCallback(() => {
    timeoutRef.current = setTimeout(() => {
      callbackRef.current();
    }, delay);
  }, [delay]);

  const handleTouchEnd = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });
    element.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchEnd);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [handleTouchStart, handleTouchEnd]);

  return elementRef;
}

/**
 * Hook for pull-to-refresh gesture
 *
 * @example
 * const { pullToRefreshProps, isPulling, pullDistance } = usePullToRefresh({
 *   onRefresh: async () => {
 *     await queryClient.invalidateQueries();
 *   },
 * });
 *
 * return (
 *   <div {...pullToRefreshProps}>
 *     {isPulling && <RefreshIndicator distance={pullDistance} />}
 *     <Content />
 *   </div>
 * );
 */
export function usePullToRefresh(config: {
  onRefresh: () => Promise<void> | void;
  threshold?: number;
  maxPull?: number;
}) {
  const { onRefresh, threshold = 80, maxPull = 150 } = config;

  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);
  const currentY = useRef<number>(0);
  const isRefreshing = useRef(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    // Only enable if at top of scroll
    const container = containerRef.current;
    if (!container || container.scrollTop > 0) return;

    startY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (startY.current === null || isRefreshing.current) return;

      const y = e.touches[0].clientY;
      const diff = Math.min(y - startY.current, maxPull);

      if (diff > 0) {
        currentY.current = diff;
        // Could update UI here with pull distance
      }
    },
    [maxPull]
  );

  const handleTouchEnd = useCallback(async () => {
    if (startY.current === null) return;

    if (currentY.current >= threshold && !isRefreshing.current) {
      isRefreshing.current = true;
      await onRefresh();
      isRefreshing.current = false;
    }

    startY.current = null;
    currentY.current = 0;
  }, [threshold, onRefresh]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    ref: containerRef,
  };
}
