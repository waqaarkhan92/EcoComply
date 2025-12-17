'use client';

import { ReactNode, useState } from 'react';
import { cn } from '@/lib/utils';
import { Check, Loader2, Circle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export type StepStatus = 'pending' | 'active' | 'completed' | 'error';

export interface ProgressStep {
  id: string;
  label: string;
  description?: string;
  status: StepStatus;
}

interface ProgressIndicatorProps {
  steps: ProgressStep[];
  className?: string;
  /** Show as horizontal stepper instead of vertical */
  horizontal?: boolean;
  /** Show percentage progress bar */
  showPercentage?: boolean;
}

const statusIcons: Record<StepStatus, ReactNode> = {
  pending: <Circle className="w-4 h-4 text-gray-400" />,
  active: <Loader2 className="w-4 h-4 text-primary animate-spin" />,
  completed: <Check className="w-4 h-4 text-white" />,
  error: <AlertCircle className="w-4 h-4 text-white" />,
};

const statusColors: Record<StepStatus, string> = {
  pending: 'bg-gray-200 border-gray-300',
  active: 'bg-primary/20 border-primary',
  completed: 'bg-green-500 border-green-500',
  error: 'bg-red-500 border-red-500',
};

export function ProgressIndicator({
  steps,
  className,
  horizontal = false,
  showPercentage = true,
}: ProgressIndicatorProps) {
  const completedCount = steps.filter((s) => s.status === 'completed').length;
  const percentage = Math.round((completedCount / steps.length) * 100);
  const hasError = steps.some((s) => s.status === 'error');

  return (
    <div className={cn('space-y-4', className)}>
      {/* Progress bar with percentage */}
      {showPercentage && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">Progress</span>
            <span className={cn('font-medium', hasError ? 'text-red-600' : 'text-text-primary')}>
              {percentage}%
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className={cn(
                'h-full rounded-full',
                hasError ? 'bg-red-500' : 'bg-primary'
              )}
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>
      )}

      {/* Steps */}
      <div
        className={cn(
          horizontal
            ? 'flex items-start gap-4'
            : 'space-y-3'
        )}
      >
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={cn(
              'flex gap-3',
              horizontal ? 'flex-col items-center flex-1' : 'items-start'
            )}
          >
            {/* Icon and connector */}
            <div className={cn('flex items-center', horizontal ? 'flex-col' : '')}>
              {/* Step icon */}
              <div
                className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors',
                  statusColors[step.status]
                )}
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step.status}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {statusIcons[step.status]}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'bg-gray-200',
                    horizontal ? 'h-0.5 flex-1 mx-2' : 'w-0.5 h-6 ml-[15px]',
                    step.status === 'completed' && 'bg-green-500'
                  )}
                />
              )}
            </div>

            {/* Label and description */}
            <div className={cn(horizontal ? 'text-center' : 'flex-1 min-w-0')}>
              <p
                className={cn(
                  'text-sm font-medium truncate',
                  step.status === 'active' && 'text-primary',
                  step.status === 'completed' && 'text-green-600',
                  step.status === 'error' && 'text-red-600',
                  step.status === 'pending' && 'text-text-secondary'
                )}
              >
                {step.label}
              </p>
              {step.description && !horizontal && (
                <p className="text-xs text-text-tertiary mt-0.5">{step.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Simple indeterminate progress bar
 */
interface IndeterminateProgressProps {
  label?: string;
  className?: string;
}

export function IndeterminateProgress({ label, className }: IndeterminateProgressProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {label && <p className="text-sm text-text-secondary">{label}</p>}
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <motion.div
          className="h-full w-1/3 bg-primary rounded-full"
          animate={{
            x: ['0%', '200%', '0%'],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>
    </div>
  );
}

/**
 * Circular progress indicator
 */
interface CircularProgressProps {
  value: number;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  className?: string;
}

const sizeConfig = {
  sm: { size: 40, strokeWidth: 3, fontSize: 'text-xs' },
  md: { size: 60, strokeWidth: 4, fontSize: 'text-sm' },
  lg: { size: 80, strokeWidth: 5, fontSize: 'text-base' },
};

export function CircularProgress({
  value,
  size = 'md',
  showValue = true,
  className,
}: CircularProgressProps) {
  const config = sizeConfig[size];
  const radius = (config.size - config.strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={config.size} height={config.size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={config.size / 2}
          cy={config.size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={config.strokeWidth}
          className="text-gray-200"
        />
        {/* Progress circle */}
        <motion.circle
          cx={config.size / 2}
          cy={config.size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={config.strokeWidth}
          strokeLinecap="round"
          className="text-primary"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </svg>
      {showValue && (
        <span className={cn('absolute font-semibold text-text-primary', config.fontSize)}>
          {value}%
        </span>
      )}
    </div>
  );
}

/**
 * Hook to manage progress steps
 */
export function useProgressSteps(initialSteps: Omit<ProgressStep, 'status'>[]) {
  const [steps, setSteps] = useState<ProgressStep[]>(
    initialSteps.map((s) => ({ ...s, status: 'pending' as StepStatus }))
  );

  const setStepStatus = (stepId: string, status: StepStatus) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === stepId ? { ...s, status } : s))
    );
  };

  const startStep = (stepId: string) => setStepStatus(stepId, 'active');
  const completeStep = (stepId: string) => setStepStatus(stepId, 'completed');
  const failStep = (stepId: string) => setStepStatus(stepId, 'error');
  const resetSteps = () => {
    setSteps(initialSteps.map((s) => ({ ...s, status: 'pending' as StepStatus })));
  };

  return {
    steps,
    setStepStatus,
    startStep,
    completeStep,
    failStep,
    resetSteps,
  };
}
