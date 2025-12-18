'use client';

/**
 * FormErrorBoundary Component
 *
 * A specialized error boundary for forms that provides:
 * - Graceful error handling
 * - User-friendly error messages
 * - Form state recovery
 * - Error reporting
 */

import { Component, ReactNode } from 'react';
import { motion } from 'framer-motion';

interface FormErrorBoundaryProps {
  children: ReactNode;
  /**
   * Callback when an error occurs
   */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /**
   * Custom fallback component
   */
  fallback?: (error: Error, resetError: () => void) => ReactNode;
  /**
   * Whether to show error details (dev mode)
   */
  showDetails?: boolean;
}

interface FormErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class FormErrorBoundary extends Component<
  FormErrorBoundaryProps,
  FormErrorBoundaryState
> {
  constructor(props: FormErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<FormErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Form Error Boundary caught an error:', error, errorInfo);

    this.setState({
      errorInfo,
    });

    // Call onError callback if provided
    this.props.onError?.(error, errorInfo);
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError);
      }

      // Default error UI
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 bg-red-50 border border-red-200 rounded-lg"
        >
          <div className="flex items-start gap-3">
            <svg
              className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-900 mb-2">
                Form Error
              </h3>
              <p className="text-red-800 mb-4">
                We encountered an error while processing your form. Please try again.
              </p>

              {this.props.showDetails && this.state.error && (
                <details className="mb-4">
                  <summary className="cursor-pointer text-sm text-red-700 hover:text-red-900 font-medium">
                    Error Details
                  </summary>
                  <div className="mt-2 p-3 bg-white rounded border border-red-200">
                    <p className="text-sm font-mono text-red-900 mb-2">
                      {this.state.error.toString()}
                    </p>
                    {this.state.errorInfo && (
                      <pre className="text-xs text-gray-700 overflow-auto max-h-40">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    )}
                  </div>
                </details>
              )}

              <button
                onClick={this.resetError}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </motion.div>
      );
    }

    return this.props.children;
  }
}

/**
 * FormFieldErrorBoundary - A lighter version for individual form fields
 */
export function FormFieldErrorBoundary({
  children,
  fieldName,
  onError,
}: {
  children: ReactNode;
  fieldName: string;
  onError?: (error: Error) => void;
}) {
  return (
    <FormErrorBoundary
      onError={(error) => {
        console.error(`Error in form field "${fieldName}":`, error);
        onError?.(error);
      }}
      fallback={(error, reset) => (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
          <div className="flex items-center gap-2 mb-2">
            <svg
              className="w-4 h-4 text-amber-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm font-medium text-amber-900">
              Error loading field: {fieldName}
            </span>
          </div>
          <button
            onClick={reset}
            className="text-xs text-amber-700 hover:text-amber-900 underline"
          >
            Retry
          </button>
        </div>
      )}
    >
      {children}
    </FormErrorBoundary>
  );
}

export default FormErrorBoundary;
