/**
 * Enhanced Forms System
 *
 * A comprehensive form handling system with:
 * - Real-time validation with debounce
 * - Async validation support
 * - Autosave functionality
 * - Unsaved changes detection
 * - Visual save status indicators
 * - Error boundaries
 * - Animated error messages
 */

// Core Components
export { FormField } from './FormField';
export type { AsyncValidator } from './FormField';

// Save Status Indicators
export {
  FormSaveStatus,
  FormSaveStatusCard,
  FormSaveStatusBadge,
} from './FormSaveStatus';

// Error Handling
export {
  FormErrorBoundary,
  FormFieldErrorBoundary,
} from './FormErrorBoundary';

// Hooks
export { useFormWithUnsavedChanges } from '@/lib/hooks/useFormWithUnsavedChanges';
export type {
  UseFormWithUnsavedChangesOptions,
  UseFormWithUnsavedChangesReturn,
} from '@/lib/hooks/useFormWithUnsavedChanges';

export { useFormAutosave } from '@/lib/hooks/use-form-autosave';
export type {
  UseFormAutosaveOptions,
  UseFormAutosaveReturn,
  SaveStatus,
  StorageType,
} from '@/lib/hooks/use-form-autosave';

// Validation Utilities
export {
  // Synchronous Validators
  validateEmail,
  validatePhone,
  validateUrl,
  validateStrongPassword,
  validateAlphanumeric,
  validateMinLength,
  validateMaxLength,
  validateFutureDate,
  validatePastDate,
  validateRange,
  validateFileSize,
  validateFileType,

  // Async Validator Creators
  createEmailUniquenessValidator,
  createUsernameUniquenessValidator,
  createUniquenessValidator,
  createCustomAsyncValidator,
  createFileValidator,

  // Zod Schema Builders
  emailSchema,
  passwordSchema,
  phoneSchema,
  urlSchema,
  stringSchema,
  numberSchema,

  // Helpers
  composeValidators,
  sanitizeInput,
  normalizePhoneNumber,
  formatPhoneNumber,
  formatCreditCard,

  // Constants
  VALIDATION_PATTERNS,
  VALIDATION_MESSAGES,
} from '@/lib/utils/form-validation';

// Examples (for reference/documentation)
export {
  BasicFormExample,
  SignupFormWithAsyncValidation,
  ProfileFormWithUnsavedChanges,
  LongFormWithAutosave,
  ComprehensiveFormExample,
} from './FormExamples';
