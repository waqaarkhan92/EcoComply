import React from 'react';
import { Clock, AlertCircle, XCircle, CheckCircle2, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatusBadgeConfig {
  label: string;
  className: string;
  icon: LucideIcon;
  pulse: boolean;
}

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const statusConfigs: Record<string, StatusBadgeConfig> = {
    PENDING: {
      label: 'Pending',
      className: 'bg-gradient-to-r from-yellow-50 to-yellow-100 text-yellow-700 border-yellow-200/50',
      icon: Clock,
      pulse: false,
    },
    DUE_SOON: {
      label: 'Due Soon',
      className: 'bg-gradient-to-r from-orange-50 to-orange-100 text-orange-700 border-orange-200/50',
      icon: AlertCircle,
      pulse: true,
    },
    OVERDUE: {
      label: 'Overdue',
      className: 'bg-gradient-to-r from-red-50 to-red-100 text-red-700 border-red-200/50',
      icon: XCircle,
      pulse: true,
    },
    COMPLETED: {
      label: 'Completed',
      className: 'bg-gradient-to-r from-green-50 to-green-100 text-green-700 border-green-200/50',
      icon: CheckCircle2,
      pulse: false,
    },
    NOT_APPLICABLE: {
      label: 'N/A',
      className: 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-600 border-gray-200/50',
      icon: XCircle,
      pulse: false,
    },
    ACTIVE: {
      label: 'Active',
      className: 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border-blue-200/50',
      icon: CheckCircle2,
      pulse: false,
    },
  };

  const config = statusConfigs[status] || {
    label: status,
    className: 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-800 border-gray-200/50',
    icon: Clock,
    pulse: false,
  };

  const Icon = config.icon;

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs gap-1',
    md: 'px-3 py-1.5 text-xs gap-1.5',
    lg: 'px-4 py-2 text-sm gap-2',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-semibold shadow-sm border transition-all duration-200',
        sizeClasses[size],
        config.className
      )}
    >
      <Icon className={cn(iconSizes[size], config.pulse && 'animate-pulse')} />
      {config.label}
    </span>
  );
}
