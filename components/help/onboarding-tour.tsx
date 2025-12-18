'use client';

/**
 * Onboarding Tour Component
 * Step-by-step guided tour for new users
 */

import { useState, useEffect, useRef } from 'react';
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TourStep {
  target: string; // CSS selector for the element to highlight
  title: string;
  content: string | React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  action?: () => void; // Optional action to perform before showing this step
}

export interface OnboardingTourProps {
  tourId: string; // Unique ID for this tour (used for localStorage)
  steps: TourStep[];
  onComplete?: () => void;
  onSkip?: () => void;
  autoStart?: boolean;
  showProgress?: boolean;
}

export function OnboardingTour({
  tourId,
  steps,
  onComplete,
  onSkip,
  autoStart = true,
  showProgress = true,
}: OnboardingTourProps) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightPosition, setHighlightPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Check if tour has been completed
  useEffect(() => {
    const tourCompleted = localStorage.getItem(`tour_${tourId}_completed`);
    if (!tourCompleted && autoStart) {
      // Small delay to ensure DOM is ready
      setTimeout(() => setIsActive(true), 500);
    }
  }, [tourId, autoStart]);

  // Update highlight and tooltip position when step changes
  useEffect(() => {
    if (!isActive || currentStep >= steps.length) return;

    const step = steps[currentStep];

    // Execute step action if provided
    if (step.action) {
      step.action();
    }

    // Wait for DOM updates
    setTimeout(() => {
      const targetElement = document.querySelector(step.target);
      if (!targetElement) {
        console.warn(`Tour step target not found: ${step.target}`);
        return;
      }

      const rect = targetElement.getBoundingClientRect();
      const padding = 8;

      // Set highlight position
      setHighlightPosition({
        top: rect.top + window.scrollY - padding,
        left: rect.left + window.scrollX - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
      });

      // Calculate tooltip position
      if (tooltipRef.current) {
        const tooltipRect = tooltipRef.current.getBoundingClientRect();
        const spacing = 16;

        let top = 0;
        let left = 0;

        const position = step.position || 'bottom';

        switch (position) {
          case 'top':
            top = rect.top + window.scrollY - tooltipRect.height - spacing;
            left = rect.left + window.scrollX + rect.width / 2 - tooltipRect.width / 2;
            break;
          case 'bottom':
            top = rect.bottom + window.scrollY + spacing;
            left = rect.left + window.scrollX + rect.width / 2 - tooltipRect.width / 2;
            break;
          case 'left':
            top = rect.top + window.scrollY + rect.height / 2 - tooltipRect.height / 2;
            left = rect.left + window.scrollX - tooltipRect.width - spacing;
            break;
          case 'right':
            top = rect.top + window.scrollY + rect.height / 2 - tooltipRect.height / 2;
            left = rect.right + window.scrollX + spacing;
            break;
        }

        // Keep within viewport
        const maxWidth = window.innerWidth - spacing * 2;
        const maxHeight = window.innerHeight - spacing * 2;

        if (left < spacing) left = spacing;
        if (left + tooltipRect.width > maxWidth) {
          left = maxWidth - tooltipRect.width;
        }

        if (top < spacing) top = spacing;
        if (top + tooltipRect.height > maxHeight) {
          top = maxHeight - tooltipRect.height;
        }

        setTooltipPosition({ top, left });

        // Scroll element into view
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'center',
        });
      }
    }, 100);
  }, [isActive, currentStep, steps]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleSkip();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrevious();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isActive, currentStep]);

  const handleNext = () => {
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

  const handleComplete = () => {
    localStorage.setItem(`tour_${tourId}_completed`, 'true');
    setIsActive(false);
    onComplete?.();
  };

  const handleSkip = () => {
    localStorage.setItem(`tour_${tourId}_completed`, 'true');
    setIsActive(false);
    onSkip?.();
  };

  // Reset tour (exposed via window for debugging)
  useEffect(() => {
    (window as any).resetTour = (id?: string) => {
      const targetId = id || tourId;
      localStorage.removeItem(`tour_${targetId}_completed`);
      if (!id || id === tourId) {
        setIsActive(true);
        setCurrentStep(0);
      }
    };
  }, [tourId]);

  if (!isActive || steps.length === 0) return null;

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;
  const isLastStep = currentStep === steps.length - 1;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[9999] bg-black/50 transition-opacity"
        onClick={handleSkip}
        aria-hidden="true"
      />

      {/* Highlight cutout */}
      <div
        className="fixed z-[10000] pointer-events-none"
        style={{
          top: `${highlightPosition.top}px`,
          left: `${highlightPosition.left}px`,
          width: `${highlightPosition.width}px`,
          height: `${highlightPosition.height}px`,
        }}
      >
        <div className="absolute inset-0 rounded-lg border-4 border-blue-500 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] animate-pulse" />
      </div>

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="fixed z-[10001] w-full max-w-md"
        style={{
          top: `${tooltipPosition.top}px`,
          left: `${tooltipPosition.left}px`,
        }}
      >
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Header */}
          <div className="flex items-start justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {currentStepData.title}
              </h3>
              {showProgress && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Step {currentStep + 1} of {steps.length}
                </p>
              )}
            </div>
            <button
              onClick={handleSkip}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors rounded"
              aria-label="Skip tour"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            <div className="text-sm text-gray-600 dark:text-gray-300">
              {currentStepData.content}
            </div>
          </div>

          {/* Progress bar */}
          {showProgress && (
            <div className="px-4 pb-2">
              <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleSkip}
              className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              Skip tour
            </button>

            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <button
                  onClick={handlePrevious}
                  className={cn(
                    'flex items-center gap-1 px-3 py-2 rounded-lg',
                    'text-sm font-medium',
                    'text-gray-700 dark:text-gray-300',
                    'bg-gray-100 dark:bg-gray-700',
                    'hover:bg-gray-200 dark:hover:bg-gray-600',
                    'transition-colors'
                  )}
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>
              )}

              <button
                onClick={handleNext}
                className={cn(
                  'flex items-center gap-1 px-4 py-2 rounded-lg',
                  'text-sm font-medium',
                  'text-white',
                  'bg-blue-500 hover:bg-blue-600',
                  'transition-colors'
                )}
              >
                {isLastStep ? (
                  <>
                    <Check size={16} />
                    Finish
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Preset tours for common workflows

export const dashboardTourSteps: TourStep[] = [
  {
    target: '[data-tour="dashboard-overview"]',
    title: 'Welcome to EcoComply!',
    content:
      'This is your dashboard where you can see an overview of your compliance status, upcoming obligations, and recent activity.',
    position: 'bottom',
  },
  {
    target: '[data-tour="obligations-nav"]',
    title: 'Manage Obligations',
    content:
      'Click here to view and manage all your compliance obligations. You can create new obligations, track deadlines, and mark them as complete.',
    position: 'right',
  },
  {
    target: '[data-tour="documents-nav"]',
    title: 'Upload Documents',
    content:
      'Upload your environmental permits and documents here. Our AI will automatically extract obligations and deadlines.',
    position: 'right',
  },
  {
    target: '[data-tour="notifications"]',
    title: 'Stay Updated',
    content:
      'Check your notifications here for upcoming deadlines, required actions, and system updates.',
    position: 'bottom',
  },
];

export const createObligationTourSteps: TourStep[] = [
  {
    target: '[data-tour="create-obligation-button"]',
    title: 'Create a New Obligation',
    content: 'Click this button to create a new compliance obligation.',
    position: 'bottom',
  },
  {
    target: '[data-tour="obligation-title"]',
    title: 'Add a Title',
    content: 'Give your obligation a clear, descriptive title.',
    position: 'right',
  },
  {
    target: '[data-tour="obligation-deadline"]',
    title: 'Set a Deadline',
    content: 'Set when this obligation is due. You\'ll receive reminders before the deadline.',
    position: 'right',
  },
  {
    target: '[data-tour="obligation-category"]',
    title: 'Choose a Category',
    content: 'Categorize your obligation to help with organization and reporting.',
    position: 'right',
  },
];

export const uploadEvidenceTourSteps: TourStep[] = [
  {
    target: '[data-tour="upload-evidence-button"]',
    title: 'Upload Evidence',
    content: 'Upload documents, photos, or reports as evidence of compliance.',
    position: 'bottom',
  },
  {
    target: '[data-tour="evidence-validity"]',
    title: 'Set Validity Period',
    content: 'Specify how long this evidence is valid for. You\'ll be notified when it expires.',
    position: 'right',
  },
];

export const notificationsTourSteps: TourStep[] = [
  {
    target: '[data-tour="notification-settings"]',
    title: 'Notification Settings',
    content:
      'Configure how you want to be notified about deadlines, updates, and important events.',
    position: 'bottom',
  },
  {
    target: '[data-tour="email-notifications"]',
    title: 'Email Notifications',
    content: 'Choose which notifications you want to receive via email.',
    position: 'right',
  },
  {
    target: '[data-tour="reminder-schedule"]',
    title: 'Reminder Schedule',
    content: 'Set when you want to receive reminders before deadlines (e.g., 7 days, 3 days, 1 day).',
    position: 'right',
  },
];
