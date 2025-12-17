'use client';

import { ReactNode, useCallback, useState } from 'react';
import { Modal } from './modal';
import { Button } from './button';
import { AlertTriangle, Trash2, Info, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ConfirmDialogVariant = 'danger' | 'warning' | 'info' | 'success';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmDialogVariant;
  loading?: boolean;
  /** Additional content below the message */
  children?: ReactNode;
}

const variantConfig: Record<
  ConfirmDialogVariant,
  {
    icon: typeof AlertTriangle;
    iconColor: string;
    iconBgColor: string;
    buttonVariant: 'danger' | 'primary';
  }
> = {
  danger: {
    icon: Trash2,
    iconColor: 'text-red-600',
    iconBgColor: 'bg-red-100',
    buttonVariant: 'danger',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-amber-600',
    iconBgColor: 'bg-amber-100',
    buttonVariant: 'primary',
  },
  info: {
    icon: Info,
    iconColor: 'text-blue-600',
    iconBgColor: 'bg-blue-100',
    buttonVariant: 'primary',
  },
  success: {
    icon: CheckCircle,
    iconColor: 'text-green-600',
    iconBgColor: 'bg-green-100',
    buttonVariant: 'primary',
  },
};

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false,
  children,
}: ConfirmDialogProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const config = variantConfig[variant];
  const Icon = config.icon;

  const handleConfirm = useCallback(async () => {
    setIsConfirming(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Confirm action failed:', error);
    } finally {
      setIsConfirming(false);
    }
  }, [onConfirm, onClose]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" showCloseButton={false}>
      <div className="flex flex-col items-center text-center py-2">
        {/* Icon */}
        <div
          className={cn(
            'flex items-center justify-center w-14 h-14 rounded-full mb-4',
            config.iconBgColor
          )}
        >
          <Icon className={cn('w-7 h-7', config.iconColor)} />
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-text-primary mb-2">{title}</h3>

        {/* Message */}
        <div className="text-text-secondary text-sm mb-4">
          {typeof message === 'string' ? <p>{message}</p> : message}
        </div>

        {/* Additional content */}
        {children && <div className="w-full mb-4">{children}</div>}

        {/* Actions */}
        <div className="flex gap-3 w-full">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isConfirming || loading}
            fullWidth
          >
            {cancelText}
          </Button>
          <Button
            variant={config.buttonVariant}
            onClick={handleConfirm}
            loading={isConfirming || loading}
            fullWidth
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/**
 * Hook to easily manage confirm dialog state
 */
export function useConfirmDialog() {
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    title: string;
    message: string | ReactNode;
    confirmText?: string;
    cancelText?: string;
    variant?: ConfirmDialogVariant;
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const openDialog = useCallback(
    (options: {
      title: string;
      message: string | ReactNode;
      confirmText?: string;
      cancelText?: string;
      variant?: ConfirmDialogVariant;
      onConfirm: () => void | Promise<void>;
    }) => {
      setDialogState({ ...options, isOpen: true });
    },
    []
  );

  const closeDialog = useCallback(() => {
    setDialogState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const confirmDelete = useCallback(
    (itemName: string, onConfirm: () => void | Promise<void>) => {
      openDialog({
        title: 'Delete ' + itemName + '?',
        message: `Are you sure you want to delete this ${itemName.toLowerCase()}? This action cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        variant: 'danger',
        onConfirm,
      });
    },
    [openDialog]
  );

  const confirmAction = useCallback(
    (
      title: string,
      message: string,
      onConfirm: () => void | Promise<void>,
      variant: ConfirmDialogVariant = 'warning'
    ) => {
      openDialog({
        title,
        message,
        variant,
        onConfirm,
      });
    },
    [openDialog]
  );

  return {
    dialogState,
    openDialog,
    closeDialog,
    confirmDelete,
    confirmAction,
    ConfirmDialogComponent: (
      <ConfirmDialog
        isOpen={dialogState.isOpen}
        onClose={closeDialog}
        onConfirm={dialogState.onConfirm}
        title={dialogState.title}
        message={dialogState.message}
        confirmText={dialogState.confirmText}
        cancelText={dialogState.cancelText}
        variant={dialogState.variant}
      />
    ),
  };
}
