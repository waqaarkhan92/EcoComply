'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TooltipProps {
  content: string | ReactNode;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  className?: string;
}

export function Tooltip({
  content,
  children,
  position = 'top',
  delay = 300,
  className,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showTimeout, setShowTimeout] = useState<NodeJS.Timeout | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const showTooltip = () => {
    const timeout = setTimeout(() => {
      setIsVisible(true);
    }, delay);
    setShowTimeout(timeout);
  };

  const hideTooltip = () => {
    if (showTimeout) {
      clearTimeout(showTimeout);
      setShowTimeout(null);
    }
    setIsVisible(false);
  };

  // Position calculation
  useEffect(() => {
    if (isVisible && tooltipRef.current && triggerRef.current) {
      const tooltip = tooltipRef.current;
      const trigger = triggerRef.current;
      const rect = trigger.getBoundingClientRect();

      switch (position) {
        case 'top':
          tooltip.style.bottom = `${rect.height + 8}px`;
          tooltip.style.left = '50%';
          tooltip.style.transform = 'translateX(-50%)';
          break;
        case 'bottom':
          tooltip.style.top = `${rect.height + 8}px`;
          tooltip.style.left = '50%';
          tooltip.style.transform = 'translateX(-50%)';
          break;
        case 'left':
          tooltip.style.right = `${rect.width + 8}px`;
          tooltip.style.top = '50%';
          tooltip.style.transform = 'translateY(-50%)';
          break;
        case 'right':
          tooltip.style.left = `${rect.width + 8}px`;
          tooltip.style.top = '50%';
          tooltip.style.transform = 'translateY(-50%)';
          break;
      }
    }
  }, [isVisible, position]);

  const positionClasses = {
    top: 'bottom-full mb-2',
    bottom: 'top-full mt-2',
    left: 'right-full mr-2',
    right: 'left-full ml-2',
  };

  return (
    <div
      ref={triggerRef}
      className="relative inline-block"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      {isVisible && (
        <div
          ref={tooltipRef}
          className={cn(
            'absolute z-50 px-3 py-2 text-sm text-white bg-charcoal rounded-lg shadow-lg whitespace-nowrap pointer-events-none',
            positionClasses[position],
            className
          )}
          role="tooltip"
        >
          {content}
          {/* Arrow */}
          <div
            className={cn(
              'absolute w-2 h-2 bg-charcoal transform rotate-45',
              position === 'top' && 'top-full left-1/2 -translate-x-1/2 -translate-y-1/2',
              position === 'bottom' && 'bottom-full left-1/2 -translate-x-1/2 translate-y-1/2',
              position === 'left' && 'left-full top-1/2 -translate-y-1/2 -translate-x-1/2',
              position === 'right' && 'right-full top-1/2 -translate-y-1/2 translate-x-1/2'
            )}
          />
        </div>
      )}
    </div>
  );
}

