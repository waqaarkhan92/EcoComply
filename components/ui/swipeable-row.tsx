'use client';

import { useState, useRef, useCallback, ReactNode } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { CheckCircle, X, MoreHorizontal } from 'lucide-react';

interface SwipeAction {
  id: string;
  icon: ReactNode;
  label: string;
  color: string;
  bgColor: string;
  onAction: () => void;
}

interface SwipeableRowProps {
  children: ReactNode;
  /** Actions revealed when swiping right (usually positive actions like complete) */
  leftActions?: SwipeAction[];
  /** Actions revealed when swiping left (usually negative actions like delete) */
  rightActions?: SwipeAction[];
  /** Threshold in pixels to trigger action (default: 80) */
  threshold?: number;
  /** Maximum swipe distance (default: 120) */
  maxSwipe?: number;
  /** Disable swipe functionality */
  disabled?: boolean;
  /** Additional className for the row container */
  className?: string;
}

/**
 * SwipeableRow Component
 *
 * A row that reveals action buttons when swiped on mobile devices.
 * Uses Framer Motion for smooth gestures.
 *
 * @example
 * <SwipeableRow
 *   leftActions={[
 *     {
 *       id: 'complete',
 *       icon: <Check />,
 *       label: 'Complete',
 *       color: 'white',
 *       bgColor: 'bg-success',
 *       onAction: () => markComplete(),
 *     },
 *   ]}
 *   rightActions={[
 *     {
 *       id: 'delete',
 *       icon: <Trash />,
 *       label: 'Delete',
 *       color: 'white',
 *       bgColor: 'bg-danger',
 *       onAction: () => deleteItem(),
 *     },
 *   ]}
 * >
 *   <ObligationRowContent />
 * </SwipeableRow>
 */
export function SwipeableRow({
  children,
  leftActions = [],
  rightActions = [],
  threshold = 80,
  maxSwipe = 120,
  disabled = false,
  className = '',
}: SwipeableRowProps) {
  const [isOpen, setIsOpen] = useState<'left' | 'right' | null>(null);
  const constraintsRef = useRef(null);
  const x = useMotionValue(0);

  // Calculate action button widths based on current swipe position
  const leftActionWidth = useTransform(x, [0, maxSwipe], [0, maxSwipe]);
  const rightActionWidth = useTransform(x, [-maxSwipe, 0], [maxSwipe, 0]);

  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const offset = info.offset.x;
      const velocity = info.velocity.x;

      // Check if we should trigger action or snap back
      if (offset > threshold || velocity > 500) {
        // Swiped right - show left actions
        if (leftActions.length > 0) {
          setIsOpen('left');
        }
      } else if (offset < -threshold || velocity < -500) {
        // Swiped left - show right actions
        if (rightActions.length > 0) {
          setIsOpen('right');
        }
      } else {
        // Snap back to closed
        setIsOpen(null);
      }
    },
    [leftActions.length, rightActions.length, threshold]
  );

  const handleActionClick = (action: SwipeAction) => {
    action.onAction();
    setIsOpen(null);
  };

  // Close when clicking outside
  const handleRowClick = () => {
    if (isOpen) {
      setIsOpen(null);
    }
  };

  if (disabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={`relative overflow-hidden ${className}`} ref={constraintsRef}>
      {/* Left Actions (revealed on swipe right) */}
      {leftActions.length > 0 && (
        <motion.div
          className="absolute left-0 top-0 bottom-0 flex items-stretch"
          style={{ width: leftActionWidth }}
        >
          {leftActions.map((action) => (
            <button
              key={action.id}
              onClick={() => handleActionClick(action)}
              className={`flex-1 flex flex-col items-center justify-center px-4 ${action.bgColor}`}
              aria-label={action.label}
            >
              <span className={`text-${action.color}`}>{action.icon}</span>
              <span className={`text-xs mt-1 text-${action.color} font-medium`}>
                {action.label}
              </span>
            </button>
          ))}
        </motion.div>
      )}

      {/* Right Actions (revealed on swipe left) */}
      {rightActions.length > 0 && (
        <motion.div
          className="absolute right-0 top-0 bottom-0 flex items-stretch"
          style={{ width: rightActionWidth }}
        >
          {rightActions.map((action) => (
            <button
              key={action.id}
              onClick={() => handleActionClick(action)}
              className={`flex-1 flex flex-col items-center justify-center px-4 ${action.bgColor}`}
              aria-label={action.label}
            >
              <span className={`text-${action.color}`}>{action.icon}</span>
              <span className={`text-xs mt-1 text-${action.color} font-medium`}>
                {action.label}
              </span>
            </button>
          ))}
        </motion.div>
      )}

      {/* Main Content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -maxSwipe, right: maxSwipe }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        animate={{
          x: isOpen === 'left' ? maxSwipe : isOpen === 'right' ? -maxSwipe : 0,
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        style={{ x }}
        onClick={handleRowClick}
        className="relative bg-white touch-pan-y"
      >
        {children}
      </motion.div>
    </div>
  );
}

/**
 * Pre-configured swipe action factories
 */
export const swipeActionFactories = {
  complete: (onAction: () => void): SwipeAction => ({
    id: 'complete',
    icon: <CheckCircle className="h-5 w-5" />,
    label: 'Complete',
    color: 'white',
    bgColor: 'bg-success',
    onAction,
  }),

  delete: (onAction: () => void): SwipeAction => ({
    id: 'delete',
    icon: <X className="h-5 w-5" />,
    label: 'Delete',
    color: 'white',
    bgColor: 'bg-danger',
    onAction,
  }),

  more: (onAction: () => void): SwipeAction => ({
    id: 'more',
    icon: <MoreHorizontal className="h-5 w-5" />,
    label: 'More',
    color: 'white',
    bgColor: 'bg-gray-500',
    onAction,
  }),
};
