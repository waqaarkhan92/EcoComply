'use client';

/**
 * FormSaveStatus Component
 *
 * A reusable visual indicator for form save status.
 * Works with useFormAutosave hook to display save state.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { SaveStatus } from '@/lib/hooks/use-form-autosave';

interface FormSaveStatusProps {
  /**
   * Current save status from useFormAutosave
   */
  status: SaveStatus;

  /**
   * Last saved timestamp
   */
  lastSavedAt?: Date | null;

  /**
   * Whether autosave is enabled
   */
  enabled?: boolean;

  /**
   * Custom message for each status
   */
  messages?: {
    idle?: string;
    saving?: string;
    saved?: string;
    error?: string;
  };

  /**
   * Display variant
   * @default 'inline'
   */
  variant?: 'inline' | 'banner' | 'compact';

  /**
   * Show timestamp with saved status
   * @default true
   */
  showTimestamp?: boolean;

  /**
   * Custom CSS classes
   */
  className?: string;
}

export function FormSaveStatus({
  status,
  lastSavedAt,
  enabled = true,
  messages = {},
  variant = 'inline',
  showTimestamp = true,
  className = '',
}: FormSaveStatusProps) {
  if (!enabled) return null;

  const defaultMessages = {
    idle: 'Autosave enabled',
    saving: 'Saving draft...',
    saved: 'Draft saved',
    error: 'Failed to save',
  };

  const displayMessages = { ...defaultMessages, ...messages };

  const getStatusConfig = () => {
    switch (status) {
      case 'saving':
        return {
          icon: (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ),
          color: 'text-blue-600',
          bg: 'bg-blue-50',
          border: 'border-blue-200',
        };
      case 'saved':
        return {
          icon: (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          ),
          color: 'text-green-600',
          bg: 'bg-green-50',
          border: 'border-green-200',
        };
      case 'error':
        return {
          icon: (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          ),
          color: 'text-red-600',
          bg: 'bg-red-50',
          border: 'border-red-200',
        };
      default: // idle
        return {
          icon: (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z" />
            </svg>
          ),
          color: 'text-gray-600',
          bg: 'bg-gray-50',
          border: 'border-gray-200',
        };
    }
  };

  const config = getStatusConfig();

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
    } else {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  const getMessage = () => {
    let message = displayMessages[status];

    if (status === 'saved' && lastSavedAt && showTimestamp) {
      message = `${message} ${formatTimestamp(lastSavedAt)}`;
    }

    return message;
  };

  // Compact variant (just icon and badge)
  if (variant === 'compact') {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={status}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className={`inline-flex items-center gap-1.5 ${className}`}
        >
          <span className={config.color}>{config.icon}</span>
          <span className={`text-xs px-2 py-0.5 rounded ${config.bg} ${config.color} font-medium`}>
            {status}
          </span>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Banner variant (full width)
  if (variant === 'banner') {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={status}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className={`flex items-center gap-2 px-4 py-3 rounded-md border ${config.bg} ${config.border} ${className}`}
        >
          <span className={config.color}>{config.icon}</span>
          <span className={`text-sm font-medium ${config.color}`}>
            {getMessage()}
          </span>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Inline variant (default)
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={`inline-flex items-center gap-2 ${className}`}
      >
        <span className={config.color}>{config.icon}</span>
        <span className={`text-sm ${config.color}`}>{getMessage()}</span>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * FormSaveStatusCard - A card variant for prominent display
 */
export function FormSaveStatusCard({
  status,
  lastSavedAt,
  enabled = true,
  className = '',
}: Pick<FormSaveStatusProps, 'status' | 'lastSavedAt' | 'enabled' | 'className'>) {
  if (!enabled) return null;

  return (
    <div className={`p-4 rounded-lg border bg-white shadow-sm ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FormSaveStatus
            status={status}
            lastSavedAt={lastSavedAt}
            variant="inline"
          />
        </div>
        {lastSavedAt && (
          <div className="text-xs text-gray-500">
            Last saved: {lastSavedAt.toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * FormSaveStatusBadge - A minimal badge for toolbars
 */
export function FormSaveStatusBadge({
  status,
  className = '',
}: Pick<FormSaveStatusProps, 'status' | 'className'>) {
  const config = {
    saving: { color: 'bg-blue-500', pulse: true },
    saved: { color: 'bg-green-500', pulse: false },
    error: { color: 'bg-red-500', pulse: false },
    idle: { color: 'bg-gray-400', pulse: false },
  }[status];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative">
        <div className={`w-2 h-2 rounded-full ${config.color}`} />
        {config.pulse && (
          <div className={`absolute inset-0 w-2 h-2 rounded-full ${config.color} animate-ping opacity-75`} />
        )}
      </div>
      <span className="text-xs text-gray-600 capitalize">{status}</span>
    </div>
  );
}

export default FormSaveStatus;
