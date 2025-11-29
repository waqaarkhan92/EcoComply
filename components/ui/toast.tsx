'use client';

import { useEffect, ReactNode } from 'react';
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  id: string;
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: (id: string) => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const typeConfig = {
  success: {
    icon: CheckCircle2,
    bgColor: 'bg-success',
    textColor: 'text-white',
    iconColor: 'text-white',
  },
  error: {
    icon: AlertCircle,
    bgColor: 'bg-danger',
    textColor: 'text-white',
    iconColor: 'text-white',
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-warning',
    textColor: 'text-white',
    iconColor: 'text-white',
  },
  info: {
    icon: Info,
    bgColor: 'bg-primary',
    textColor: 'text-white',
    iconColor: 'text-white',
  },
};

export function Toast({ id, message, type = 'info', duration = 5000, onClose, action }: ToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(id);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, id, onClose]);

  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg min-w-[300px] max-w-md animate-slide-in-right',
        config.bgColor,
        config.textColor
      )}
      role="alert"
    >
      <Icon className={cn('h-5 w-5 flex-shrink-0', config.iconColor)} />
      <p className="flex-1 text-sm font-medium">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="text-sm font-semibold underline hover:no-underline"
        >
          {action.label}
        </button>
      )}
      <button
        onClick={() => onClose(id)}
        className="p-1 hover:opacity-70 transition-opacity"
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: Array<{
    id: string;
    message: string;
    type?: ToastType;
    duration?: number;
    action?: {
      label: string;
      onClick: () => void;
    };
  }>;
  onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 md:top-6 md:right-6 max-w-md w-full md:w-auto">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onClose={onClose} />
      ))}
    </div>
  );
}

