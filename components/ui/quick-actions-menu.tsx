'use client';

import { useState, useRef, useEffect } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger' | 'success';
  disabled?: boolean;
}

interface QuickActionsMenuProps {
  actions: QuickAction[];
  /** Show up to this many actions inline before the "more" menu */
  inlineCount?: number;
  /** Size of the action buttons */
  size?: 'sm' | 'md';
  /** Position of the dropdown menu */
  menuPosition?: 'left' | 'right';
}

export function QuickActionsMenu({
  actions,
  inlineCount = 2,
  size = 'sm',
  menuPosition = 'right',
}: QuickActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const inlineActions = actions.slice(0, inlineCount);
  const moreActions = actions.slice(inlineCount);

  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
  };

  const iconSizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
  };

  const getVariantClasses = (variant: QuickAction['variant']) => {
    switch (variant) {
      case 'danger':
        return 'text-danger hover:text-danger hover:bg-danger/10';
      case 'success':
        return 'text-success hover:text-success hover:bg-success/10';
      default:
        return 'text-text-secondary hover:text-text-primary hover:bg-gray-100';
    }
  };

  return (
    <div className="flex items-center gap-1" ref={menuRef}>
      {/* Inline Actions */}
      {inlineActions.map((action) => (
        <button
          key={action.id}
          onClick={(e) => {
            e.stopPropagation();
            action.onClick();
          }}
          disabled={action.disabled}
          className={`
            ${sizeClasses[size]}
            rounded-md transition-colors
            ${getVariantClasses(action.variant)}
            ${action.disabled ? 'opacity-50 cursor-not-allowed' : ''}
            opacity-0 group-hover:opacity-100 focus:opacity-100
          `}
          title={action.label}
          aria-label={action.label}
        >
          <span className={iconSizeClasses[size]}>{action.icon}</span>
        </button>
      ))}

      {/* More Menu */}
      {moreActions.length > 0 && (
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
            className={`
              ${sizeClasses[size]}
              rounded-md transition-colors
              text-text-secondary hover:text-text-primary hover:bg-gray-100
              opacity-0 group-hover:opacity-100 focus:opacity-100
            `}
            title="More actions"
            aria-label="More actions"
            aria-expanded={isOpen}
          >
            <MoreHorizontal className={iconSizeClasses[size]} />
          </button>

          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                transition={{ duration: 0.1 }}
                className={`
                  absolute top-full mt-1 z-50
                  ${menuPosition === 'right' ? 'right-0' : 'left-0'}
                  min-w-[160px] bg-white rounded-lg shadow-lg border border-gray-200
                  py-1
                `}
              >
                {moreActions.map((action) => (
                  <button
                    key={action.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      action.onClick();
                      setIsOpen(false);
                    }}
                    disabled={action.disabled}
                    className={`
                      w-full px-3 py-2 text-left text-sm
                      flex items-center gap-2
                      transition-colors
                      ${getVariantClasses(action.variant)}
                      ${action.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    <span className="h-4 w-4">{action.icon}</span>
                    {action.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

// Pre-configured action factories for common actions
export const quickActionFactories = {
  complete: (onClick: () => void, disabled?: boolean): QuickAction => ({
    id: 'complete',
    label: 'Mark Complete',
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    onClick,
    variant: 'success',
    disabled,
  }),

  uploadEvidence: (onClick: () => void): QuickAction => ({
    id: 'upload-evidence',
    label: 'Upload Evidence',
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
    ),
    onClick,
  }),

  reschedule: (onClick: () => void): QuickAction => ({
    id: 'reschedule',
    label: 'Reschedule',
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    onClick,
  }),

  view: (onClick: () => void): QuickAction => ({
    id: 'view',
    label: 'View Details',
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
    onClick,
  }),

  download: (onClick: () => void): QuickAction => ({
    id: 'download',
    label: 'Download',
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    ),
    onClick,
  }),

  link: (onClick: () => void): QuickAction => ({
    id: 'link',
    label: 'Link to Obligation',
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
    onClick,
  }),

  delete: (onClick: () => void): QuickAction => ({
    id: 'delete',
    label: 'Delete',
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    ),
    onClick,
    variant: 'danger',
  }),

  archive: (onClick: () => void): QuickAction => ({
    id: 'archive',
    label: 'Archive',
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
    ),
    onClick,
  }),
};
