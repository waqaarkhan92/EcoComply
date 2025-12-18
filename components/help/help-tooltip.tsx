'use client';

/**
 * Help Tooltip Component
 * Provides contextual help tooltips with hover or click triggers
 */

import { useState, useRef, useEffect } from 'react';
import { HelpCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface HelpTooltipProps {
  content: string | React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  trigger?: 'hover' | 'click';
  maxWidth?: number;
  className?: string;
  iconSize?: number;
  showIcon?: boolean;
  children?: React.ReactNode;
}

export function HelpTooltip({
  content,
  position = 'top',
  trigger = 'hover',
  maxWidth = 300,
  className,
  iconSize = 16,
  showIcon = true,
  children,
}: HelpTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Calculate tooltip position
  useEffect(() => {
    if (isVisible && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const spacing = 8; // Gap between trigger and tooltip

      let top = 0;
      let left = 0;

      switch (position) {
        case 'top':
          top = triggerRect.top - tooltipRect.height - spacing;
          left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
          break;
        case 'bottom':
          top = triggerRect.bottom + spacing;
          left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
          break;
        case 'left':
          top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
          left = triggerRect.left - tooltipRect.width - spacing;
          break;
        case 'right':
          top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
          left = triggerRect.right + spacing;
          break;
      }

      // Keep tooltip within viewport
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (left < spacing) left = spacing;
      if (left + tooltipRect.width > viewportWidth - spacing) {
        left = viewportWidth - tooltipRect.width - spacing;
      }

      if (top < spacing) top = spacing;
      if (top + tooltipRect.height > viewportHeight - spacing) {
        top = viewportHeight - tooltipRect.height - spacing;
      }

      setTooltipPosition({ top, left });
    }
  }, [isVisible, position]);

  // Handle click outside to close
  useEffect(() => {
    if (trigger === 'click' && isVisible) {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          tooltipRef.current &&
          triggerRef.current &&
          !tooltipRef.current.contains(event.target as Node) &&
          !triggerRef.current.contains(event.target as Node)
        ) {
          setIsVisible(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [trigger, isVisible]);

  const handleMouseEnter = () => {
    if (trigger === 'hover') {
      setIsVisible(true);
    }
  };

  const handleMouseLeave = () => {
    if (trigger === 'hover') {
      setIsVisible(false);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (trigger === 'click') {
      setIsVisible(!isVisible);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsVisible(false);
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsVisible(!isVisible);
    }
  };

  return (
    <div className={cn('relative inline-flex items-center', className)}>
      <button
        ref={triggerRef}
        type="button"
        className={cn(
          'inline-flex items-center justify-center',
          'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
          'transition-colors duration-200',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded',
          !children && 'p-1'
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        aria-label="Help"
        aria-expanded={isVisible}
        aria-haspopup="true"
      >
        {children || (showIcon && <HelpCircle size={iconSize} />)}
      </button>

      {isVisible && (
        <>
          {/* Backdrop for mobile (click trigger only) */}
          {trigger === 'click' && (
            <div
              className="fixed inset-0 z-40 bg-black/10 md:hidden"
              onClick={() => setIsVisible(false)}
            />
          )}

          {/* Tooltip */}
          <div
            ref={tooltipRef}
            className={cn(
              'fixed z-50',
              'bg-white dark:bg-gray-800',
              'border border-gray-200 dark:border-gray-700',
              'rounded-lg shadow-lg',
              'animate-in fade-in-0 zoom-in-95 duration-200'
            )}
            style={{
              top: `${tooltipPosition.top}px`,
              left: `${tooltipPosition.left}px`,
              maxWidth: `${maxWidth}px`,
            }}
            role="tooltip"
            aria-live="polite"
          >
            {/* Arrow indicator */}
            <div
              className={cn(
                'absolute w-3 h-3 rotate-45',
                'bg-white dark:bg-gray-800',
                'border-gray-200 dark:border-gray-700',
                {
                  'bottom-full left-1/2 -translate-x-1/2 translate-y-1/2 border-r border-b':
                    position === 'top',
                  'top-full left-1/2 -translate-x-1/2 -translate-y-1/2 border-l border-t':
                    position === 'bottom',
                  'left-full top-1/2 -translate-x-1/2 -translate-y-1/2 border-l border-b':
                    position === 'left',
                  'right-full top-1/2 translate-x-1/2 -translate-y-1/2 border-r border-t':
                    position === 'right',
                }
              )}
            />

            {/* Content */}
            <div className="relative p-4">
              {trigger === 'click' && (
                <button
                  type="button"
                  onClick={() => setIsVisible(false)}
                  className={cn(
                    'absolute top-2 right-2',
                    'p-1 rounded',
                    'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200',
                    'transition-colors'
                  )}
                  aria-label="Close tooltip"
                >
                  <X size={16} />
                </button>
              )}

              <div
                className={cn(
                  'text-sm text-gray-700 dark:text-gray-300',
                  trigger === 'click' && 'pr-6'
                )}
              >
                {content}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Preset tooltip components for common use cases

export function InfoTooltip({ content, className }: { content: string; className?: string }) {
  return (
    <HelpTooltip
      content={content}
      position="top"
      trigger="hover"
      className={className}
      iconSize={14}
    />
  );
}

export function HelpButton({
  title,
  content,
  className,
}: {
  title?: string;
  content: string | React.ReactNode;
  className?: string;
}) {
  return (
    <HelpTooltip
      content={
        <div>
          {title && <h4 className="font-semibold text-gray-900 dark:text-white mb-2">{title}</h4>}
          <div className="text-gray-600 dark:text-gray-300">{content}</div>
        </div>
      }
      position="bottom"
      trigger="click"
      maxWidth={400}
      className={className}
    />
  );
}

export function FieldHelp({
  label,
  content,
  className,
}: {
  label: string;
  content: string;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      <HelpTooltip content={content} position="right" trigger="hover" iconSize={14} />
    </div>
  );
}
