'use client';

import { Fragment, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  side?: 'left' | 'right';
  showBackButton?: boolean;
  onBack?: () => void;
  footer?: React.ReactNode;
  className?: string;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-full',
};

export function SlideOver({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  side = 'right',
  showBackButton = false,
  onBack,
  footer,
  className,
}: SlideOverProps) {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const slideVariants = {
    hidden: {
      x: side === 'right' ? '100%' : '-100%',
      opacity: 0.5,
    },
    visible: {
      x: 0,
      opacity: 1,
      transition: {
        type: 'spring' as const,
        damping: 30,
        stiffness: 300,
      },
    },
    exit: {
      x: side === 'right' ? '100%' : '-100%',
      opacity: 0.5,
      transition: {
        type: 'spring' as const,
        damping: 30,
        stiffness: 300,
      },
    },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Fragment>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Panel */}
          <div
            className={cn(
              'fixed inset-y-0 z-50 flex',
              side === 'right' ? 'right-0' : 'left-0'
            )}
          >
            <motion.div
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={slideVariants}
              className={cn(
                'relative w-screen flex flex-col bg-white shadow-2xl',
                sizeClasses[size],
                className
              )}
            >
              {/* Header */}
              {(title || showBackButton) && (
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-10">
                  <div className="flex items-center gap-3">
                    {showBackButton && (
                      <button
                        onClick={onBack || onClose}
                        className="p-1 -ml-1 rounded-lg hover:bg-gray-100 transition-colors"
                        aria-label="Go back"
                      >
                        <ChevronLeft className="h-5 w-5 text-text-secondary" />
                      </button>
                    )}
                    <div>
                      {title && (
                        <h2 className="text-lg font-semibold text-text-primary">
                          {title}
                        </h2>
                      )}
                      {description && (
                        <p className="text-sm text-text-secondary mt-0.5">
                          {description}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    aria-label="Close panel"
                  >
                    <X className="h-5 w-5 text-text-secondary" />
                  </button>
                </div>
              )}

              {/* Content */}
              <div className="flex-1 overflow-y-auto">
                {children}
              </div>

              {/* Footer */}
              {footer && (
                <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-white sticky bottom-0">
                  {footer}
                </div>
              )}
            </motion.div>
          </div>
        </Fragment>
      )}
    </AnimatePresence>
  );
}

// Hook for managing slide-over state with URL params
export function useSlideOver(paramName: string = 'selected') {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    // Check URL params on mount
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const id = params.get(paramName);
      if (id) {
        setSelectedId(id);
        setIsOpen(true);
      }
    }
  }, [paramName]);

  const open = (id: string) => {
    setSelectedId(id);
    setIsOpen(true);
    // Update URL without navigation
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set(paramName, id);
      window.history.pushState({}, '', url.toString());
    }
  };

  const close = () => {
    setIsOpen(false);
    setSelectedId(null);
    // Remove from URL
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete(paramName);
      window.history.pushState({}, '', url.toString());
    }
  };

  return {
    isOpen,
    selectedId,
    open,
    close,
  };
}
