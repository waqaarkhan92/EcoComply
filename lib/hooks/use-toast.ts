'use client';

import { useState, useCallback } from 'react';
import { ToastType } from '@/components/ui/toast';

interface Toast {
  id: string;
  message: string;
  type?: ToastType;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', duration?: number, action?: Toast['action']) => {
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

  const closeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const success = useCallback(
    (message: string, duration?: number, action?: Toast['action']) => {
      return showToast(message, 'success', duration, action);
    },
    [showToast]
  );

  const error = useCallback(
    (message: string, duration?: number, action?: Toast['action']) => {
      return showToast(message, 'error', duration, action);
    },
    [showToast]
  );

  const warning = useCallback(
    (message: string, duration?: number, action?: Toast['action']) => {
      return showToast(message, 'warning', duration, action);
    },
    [showToast]
  );

  const info = useCallback(
    (message: string, duration?: number, action?: Toast['action']) => {
      return showToast(message, 'info', duration, action);
    },
    [showToast]
  );

  return {
    toasts,
    showToast,
    closeToast,
    success,
    error,
    warning,
    info,
  };
}

