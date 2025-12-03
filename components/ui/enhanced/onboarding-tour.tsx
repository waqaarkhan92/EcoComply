'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TourStep {
  id: string;
  title: string;
  description: string;
  target?: string; // CSS selector for the element to highlight
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: () => void;
}

interface OnboardingTourProps {
  steps: TourStep[];
  tourKey: string; // Unique key to track completion in localStorage
  onComplete?: () => void;
  autoStart?: boolean;
}

export function OnboardingTour({
  steps,
  tourKey,
  onComplete,
  autoStart = false,
}: OnboardingTourProps) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetPosition, setTargetPosition] = useState<DOMRect | null>(null);

  const storageKey = `onboarding-completed-${tourKey}`;

  // Check if tour has been completed
  useEffect(() => {
    const completed = localStorage.getItem(storageKey);
    if (!completed && autoStart) {
      setIsActive(true);
    }
  }, [storageKey, autoStart]);

  // Update target element position when step changes
  useEffect(() => {
    if (!isActive) return;

    const step = steps[currentStep];
    if (step?.target) {
      const element = document.querySelector(step.target);
      if (element) {
        const rect = element.getBoundingClientRect();
        setTargetPosition(rect);

        // Scroll element into view
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else {
      setTargetPosition(null);
    }
  }, [currentStep, isActive, steps]);

  const handleNext = () => {
    const step = steps[currentStep];
    if (step?.action) {
      step.action();
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    setIsActive(false);
    setCurrentStep(0);
  };

  const handleComplete = () => {
    localStorage.setItem(storageKey, 'true');
    setIsActive(false);
    setCurrentStep(0);
    onComplete?.();
  };

  const getTooltipPosition = () => {
    if (!targetPosition) {
      // Center of screen
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const step = steps[currentStep];
    const placement = step.placement || 'bottom';
    const spacing = 20;

    switch (placement) {
      case 'top':
        return {
          top: `${targetPosition.top - spacing}px`,
          left: `${targetPosition.left + targetPosition.width / 2}px`,
          transform: 'translate(-50%, -100%)',
        };
      case 'bottom':
        return {
          top: `${targetPosition.bottom + spacing}px`,
          left: `${targetPosition.left + targetPosition.width / 2}px`,
          transform: 'translateX(-50%)',
        };
      case 'left':
        return {
          top: `${targetPosition.top + targetPosition.height / 2}px`,
          left: `${targetPosition.left - spacing}px`,
          transform: 'translate(-100%, -50%)',
        };
      case 'right':
        return {
          top: `${targetPosition.top + targetPosition.height / 2}px`,
          left: `${targetPosition.right + spacing}px`,
          transform: 'translateY(-50%)',
        };
      default:
        return {
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        };
    }
  };

  if (!isActive || steps.length === 0) return null;

  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 z-[100] backdrop-blur-sm"
      />

      {/* Spotlight on target element */}
      {targetPosition && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed z-[101] pointer-events-none"
          style={{
            top: targetPosition.top - 8,
            left: targetPosition.left - 8,
            width: targetPosition.width + 16,
            height: targetPosition.height + 16,
            boxShadow: '0 0 0 4px rgba(16, 75, 58, 0.5), 0 0 0 9999px rgba(0, 0, 0, 0.7)',
            borderRadius: '8px',
          }}
        />
      )}

      {/* Tooltip */}
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.2 }}
        className="fixed z-[102] bg-white rounded-xl shadow-modal border border-slate-200 max-w-md w-full mx-4"
        style={getTooltipPosition()}
      >
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-slate-100 rounded-t-xl overflow-hidden">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-label-sm text-primary font-semibold">
                  Step {currentStep + 1} of {steps.length}
                </span>
              </div>
              <h3 className="text-heading-sm text-text-primary">{step.title}</h3>
            </div>
            <button
              onClick={handleSkip}
              className="text-text-tertiary hover:text-text-primary transition-colors p-1"
              aria-label="Skip tour"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Description */}
          <p className="text-body-md text-text-secondary mb-6">{step.description}</p>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevious}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {currentStep < steps.length - 1 ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSkip}
                  >
                    Skip Tour
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleNext}
                    className="gap-1"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  onClick={handleNext}
                  className="gap-1"
                >
                  <Check className="h-4 w-4" />
                  Finish
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Step Dots */}
        <div className="flex items-center justify-center gap-1.5 pb-4">
          {steps.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentStep(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentStep
                  ? 'w-6 bg-primary'
                  : index < currentStep
                  ? 'w-2 bg-primary/50'
                  : 'w-2 bg-slate-300'
              }`}
              aria-label={`Go to step ${index + 1}`}
            />
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Hook to programmatically start a tour
 */
export function useOnboardingTour(tourKey: string) {
  const [isCompleted, setIsCompleted] = useState(true);
  const [shouldStart, setShouldStart] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem(`onboarding-completed-${tourKey}`);
    setIsCompleted(!!completed);
  }, [tourKey]);

  const startTour = () => {
    setShouldStart(true);
  };

  const resetTour = () => {
    localStorage.removeItem(`onboarding-completed-${tourKey}`);
    setIsCompleted(false);
    setShouldStart(true);
  };

  return {
    isCompleted,
    shouldStart,
    startTour,
    resetTour,
  };
}

/**
 * Pre-built Dashboard Tour
 */
export const DASHBOARD_TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to EcoComply! 🎉',
    description:
      'Let\'s take a quick tour to help you get started with managing your environmental compliance.',
    placement: 'center',
  },
  {
    id: 'navigation',
    title: 'Quick Navigation',
    description:
      'Use the sidebar to navigate between different sections like Documents, Obligations, Evidence, and Packs.',
    target: '[data-tour="sidebar"]',
    placement: 'right',
  },
  {
    id: 'command-palette',
    title: 'Command Palette',
    description:
      'Press ⌘K (or Ctrl+K) at any time to open the command palette for quick navigation and actions.',
    target: '[data-tour="search"]',
    placement: 'bottom',
  },
  {
    id: 'upload-document',
    title: 'Upload Your First Document',
    description:
      'Start by uploading a permit document. Our AI will automatically extract compliance obligations in under 60 seconds.',
    target: '[data-tour="upload-button"]',
    placement: 'bottom',
  },
  {
    id: 'dashboard-stats',
    title: 'Monitor Your Compliance',
    description:
      'Track your compliance status, overdue obligations, and upcoming deadlines right from your dashboard.',
    target: '[data-tour="stats"]',
    placement: 'bottom',
  },
  {
    id: 'complete',
    title: 'You\'re All Set! 🚀',
    description:
      'You\'re ready to start managing your environmental compliance. Need help? Check our documentation or contact support.',
    placement: 'center',
  },
];
