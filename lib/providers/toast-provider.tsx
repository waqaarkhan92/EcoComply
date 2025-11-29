'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useToast } from '@/lib/hooks/use-toast';
import { ToastContainer } from '@/components/ui/toast';

interface ToastContextType {
  success: (message: string, duration?: number, action?: { label: string; onClick: () => void }) => string;
  error: (message: string, duration?: number, action?: { label: string; onClick: () => void }) => string;
  warning: (message: string, duration?: number, action?: { label: string; onClick: () => void }) => string;
  info: (message: string, duration?: number, action?: { label: string; onClick: () => void }) => string;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const { toasts, closeToast, success, error, warning, info } = useToast();

  return (
    <ToastContext.Provider value={{ success, error, warning, info }}>
      {children}
      <ToastContainer toasts={toasts} onClose={closeToast} />
    </ToastContext.Provider>
  );
}

export function useToastContext() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToastContext must be used within ToastProvider');
  }
  return context;
}

