'use client';

import { useState, useCallback, ReactNode } from 'react';
import { ToastType } from '@/components/ui/toast';

interface Toast {
  id: string;
  message: string;
  title?: string;
  description?: string;
  type?: ToastType;
  variant?: 'default' | 'destructive';
  duration?: number;
  action?: ReactNode;
}

interface ToastOptions {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
  duration?: number;
  action?: ReactNode;
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', duration?: number, action?: ReactNode) => {
      const id = Math.random().toString(36).substring(7);
      const newToast: Toast = {
        id,
        message,
        type,
        duration,
        action,
      };

      setToasts((prev) => [...prev, newToast]);
      return id;
    },
    []
  );

  // New toast method with options object (more flexible)
  const toast = useCallback(
    (options: ToastOptions | string) => {
      const id = Math.random().toString(36).substring(7);

      if (typeof options === 'string') {
        setToasts((prev) => [...prev, { id, message: options }]);
        return id;
      }

      const newToast: Toast = {
        id,
        message: options.description || options.title || '',
        title: options.title,
        description: options.description,
        variant: options.variant,
        duration: options.duration,
        action: options.action,
        type: options.variant === 'destructive' ? 'error' : 'success',
      };

      setToasts((prev) => [...prev, newToast]);
      return id;
    },
    []
  );

  const closeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const success = useCallback(
    (message: string, duration?: number, action?: ReactNode) => {
      return showToast(message, 'success', duration, action);
    },
    [showToast]
  );

  const error = useCallback(
    (message: string, duration?: number, action?: ReactNode) => {
      return showToast(message, 'error', duration, action);
    },
    [showToast]
  );

  const warning = useCallback(
    (message: string, duration?: number, action?: ReactNode) => {
      return showToast(message, 'warning', duration, action);
    },
    [showToast]
  );

  const info = useCallback(
    (message: string, duration?: number, action?: ReactNode) => {
      return showToast(message, 'info', duration, action);
    },
    [showToast]
  );

  // Undo toast helper - common pattern for destructive actions
  const successWithUndo = useCallback(
    (
      message: string,
      onUndo: () => void | Promise<void>,
      undoLabel: string = 'Undo',
      duration: number = 8000
    ) => {
      return toast({
        title: message,
        duration,
        action: (
          <button
            onClick={async () => {
              await onUndo();
            }}
            className="px-3 py-1.5 text-sm font-medium text-primary hover:text-primary/80 hover:bg-primary/10 rounded transition-colors"
          >
            {undoLabel}
          </button>
        ),
      });
    },
    [toast]
  );

  return {
    toasts,
    showToast,
    toast,
    closeToast,
    success,
    error,
    warning,
    info,
    successWithUndo,
  };
}

