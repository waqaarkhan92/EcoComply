/**
 * Form Validation Utilities
 *
 * Comprehensive validation helpers for forms including:
 * - Common validators (email, phone, URL, etc.)
 * - Async validators (check uniqueness, availability, etc.)
 * - Custom error messages
 * - Composable validation functions
 */

import { z } from 'zod';
import { AsyncValidator } from '@/components/forms/FormField';

// ============================================================================
// COMMON VALIDATION PATTERNS
// ============================================================================

export const VALIDATION_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^\+?[\d\s\-()]+$/,
  url: /^https?:\/\/.+\..+/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  alphanumericWithSpaces: /^[a-zA-Z0-9\s]+$/,
  lettersOnly: /^[a-zA-Z]+$/,
  numbersOnly: /^\d+$/,
  noSpecialChars: /^[a-zA-Z0-9\s\-_]+$/,
  strongPassword: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  zipCode: /^\d{5}(-\d{4})?$/,
  ipAddress: /^(\d{1,3}\.){3}\d{1,3}$/,
} as const;

// ============================================================================
// VALIDATION ERROR MESSAGES
// ============================================================================

export const VALIDATION_MESSAGES = {
  required: (field: string) => `${field} is required`,
  email: 'Please enter a valid email address',
  phone: 'Please enter a valid phone number',
  url: 'Please enter a valid URL',
  minLength: (field: string, min: number) =>
    `${field} must be at least ${min} characters`,
  maxLength: (field: string, max: number) =>
    `${field} must not exceed ${max} characters`,
  min: (field: string, min: number) => `${field} must be at least ${min}`,
  max: (field: string, max: number) => `${field} must not exceed ${max}`,
  match: (field1: string, field2: string) =>
    `${field1} must match ${field2}`,
  unique: (field: string) => `This ${field} is already taken`,
  strongPassword:
    'Password must contain at least 8 characters, one uppercase, one lowercase, one number and one special character',
  alphanumeric: 'Only letters and numbers are allowed',
  lettersOnly: 'Only letters are allowed',
  numbersOnly: 'Only numbers are allowed',
  futureDate: 'Date must be in the future',
  pastDate: 'Date must be in the past',
  invalidFormat: (field: string) => `Invalid ${field} format`,
} as const;

// ============================================================================
// SYNCHRONOUS VALIDATORS
// ============================================================================

/**
 * Validates email format
 */
export function validateEmail(email: string): boolean | string {
  if (!email) return true; // Let required handle empty values
  return VALIDATION_PATTERNS.email.test(email) || VALIDATION_MESSAGES.email;
}

/**
 * Validates phone number format
 */
export function validatePhone(phone: string): boolean | string {
  if (!phone) return true;
  return VALIDATION_PATTERNS.phone.test(phone) || VALIDATION_MESSAGES.phone;
}

/**
 * Validates URL format
 */
export function validateUrl(url: string): boolean | string {
  if (!url) return true;
  return VALIDATION_PATTERNS.url.test(url) || VALIDATION_MESSAGES.url;
}

/**
 * Validates minimum length
 */
export function validateMinLength(
  value: string,
  min: number,
  field: string = 'Field'
): boolean | string {
  if (!value) return true;
  return value.length >= min || VALIDATION_MESSAGES.minLength(field, min);
}

/**
 * Validates maximum length
 */
export function validateMaxLength(
  value: string,
  max: number,
  field: string = 'Field'
): boolean | string {
  if (!value) return true;
  return value.length <= max || VALIDATION_MESSAGES.maxLength(field, max);
}

/**
 * Validates strong password
 */
export function validateStrongPassword(password: string): boolean | string {
  if (!password) return true;
  return (
    VALIDATION_PATTERNS.strongPassword.test(password) ||
    VALIDATION_MESSAGES.strongPassword
  );
}

/**
 * Validates alphanumeric characters only
 */
export function validateAlphanumeric(value: string): boolean | string {
  if (!value) return true;
  return (
    VALIDATION_PATTERNS.alphanumeric.test(value) ||
    VALIDATION_MESSAGES.alphanumeric
  );
}

/**
 * Validates that two fields match (e.g., password confirmation)
 */
export function createMatchValidator(
  otherValue: string,
  field1: string,
  field2: string
) {
  return (value: string): boolean | string => {
    if (!value) return true;
    return value === otherValue || VALIDATION_MESSAGES.match(field1, field2);
  };
}

/**
 * Validates date is in the future
 */
export function validateFutureDate(dateString: string): boolean | string {
  if (!dateString) return true;
  const date = new Date(dateString);
  const now = new Date();
  return date > now || VALIDATION_MESSAGES.futureDate;
}

/**
 * Validates date is in the past
 */
export function validatePastDate(dateString: string): boolean | string {
  if (!dateString) return true;
  const date = new Date(dateString);
  const now = new Date();
  return date < now || VALIDATION_MESSAGES.pastDate;
}

/**
 * Validates number range
 */
export function validateRange(
  value: number,
  min: number,
  max: number,
  field: string = 'Value'
): boolean | string {
  if (value === null || value === undefined) return true;
  if (value < min) return VALIDATION_MESSAGES.min(field, min);
  if (value > max) return VALIDATION_MESSAGES.max(field, max);
  return true;
}

// ============================================================================
// ASYNC VALIDATORS
// ============================================================================

/**
 * Creates an async validator to check email uniqueness
 * @param checkEmailExists - Function that checks if email exists in database
 */
export function createEmailUniquenessValidator(
  checkEmailExists: (email: string) => Promise<boolean>
): AsyncValidator {
  return {
    validate: async (email: string): Promise<boolean | string> => {
      if (!email || !validateEmail(email)) {
        return true; // Let sync validation handle invalid emails
      }

      try {
        const exists = await checkEmailExists(email);
        return !exists || VALIDATION_MESSAGES.unique('email');
      } catch (error) {
        console.error('Email uniqueness check failed:', error);
        return 'Unable to verify email availability';
      }
    },
    debounceMs: 500,
  };
}

/**
 * Creates an async validator to check username uniqueness
 * @param checkUsernameExists - Function that checks if username exists in database
 */
export function createUsernameUniquenessValidator(
  checkUsernameExists: (username: string) => Promise<boolean>
): AsyncValidator {
  return {
    validate: async (username: string): Promise<boolean | string> => {
      if (!username) return true;

      // Basic format validation
      if (username.length < 3) {
        return 'Username must be at least 3 characters';
      }

      if (!VALIDATION_PATTERNS.alphanumeric.test(username)) {
        return 'Username can only contain letters and numbers';
      }

      try {
        const exists = await checkUsernameExists(username);
        return !exists || VALIDATION_MESSAGES.unique('username');
      } catch (error) {
        console.error('Username uniqueness check failed:', error);
        return 'Unable to verify username availability';
      }
    },
    debounceMs: 500,
  };
}

/**
 * Creates a generic async validator for uniqueness checks
 */
export function createUniquenessValidator(
  checkExists: (value: string) => Promise<boolean>,
  field: string,
  additionalValidation?: (value: string) => boolean | string
): AsyncValidator {
  return {
    validate: async (value: string): Promise<boolean | string> => {
      if (!value) return true;

      // Run additional sync validation first if provided
      if (additionalValidation) {
        const syncResult = additionalValidation(value);
        if (syncResult !== true) return syncResult;
      }

      try {
        const exists = await checkExists(value);
        return !exists || VALIDATION_MESSAGES.unique(field);
      } catch (error) {
        console.error(`${field} uniqueness check failed:`, error);
        return `Unable to verify ${field} availability`;
      }
    },
    debounceMs: 500,
  };
}

/**
 * Creates an async validator with custom API call
 */
export function createCustomAsyncValidator(
  validateFn: (value: string) => Promise<boolean | string>,
  debounceMs: number = 500
): AsyncValidator {
  return {
    validate: validateFn,
    debounceMs,
  };
}

// ============================================================================
// ZOD SCHEMA BUILDERS
// ============================================================================

/**
 * Creates a Zod schema for email validation
 */
export function emailSchema(required: boolean = true) {
  const baseSchema = z.string().email(VALIDATION_MESSAGES.email);
  if (!required) {
    return baseSchema.optional();
  }
  return baseSchema;
}

/**
 * Creates a Zod schema for password validation
 */
export function passwordSchema(
  minLength: number = 8,
  requireStrong: boolean = true
) {
  let schema = z
    .string()
    .min(minLength, VALIDATION_MESSAGES.minLength('Password', minLength));

  if (requireStrong) {
    schema = schema.regex(
      VALIDATION_PATTERNS.strongPassword,
      VALIDATION_MESSAGES.strongPassword
    );
  }

  return schema;
}

/**
 * Creates a Zod schema for phone validation
 */
export function phoneSchema(required: boolean = false) {
  const baseSchema = z.string().regex(VALIDATION_PATTERNS.phone, VALIDATION_MESSAGES.phone);
  if (!required) {
    return baseSchema.optional();
  }
  return baseSchema;
}

/**
 * Creates a Zod schema for URL validation
 */
export function urlSchema(required: boolean = false) {
  const baseSchema = z.string().url(VALIDATION_MESSAGES.url);
  if (!required) {
    return baseSchema.optional();
  }
  return baseSchema;
}

/**
 * Creates a Zod schema with min/max length
 */
export function stringSchema(
  field: string,
  minLength?: number,
  maxLength?: number,
  required: boolean = true
) {
  let baseSchema = z.string();

  if (minLength) {
    baseSchema = baseSchema.min(minLength, VALIDATION_MESSAGES.minLength(field, minLength));
  }

  if (maxLength) {
    baseSchema = baseSchema.max(maxLength, VALIDATION_MESSAGES.maxLength(field, maxLength));
  }

  if (!required) {
    return baseSchema.optional();
  }

  return baseSchema;
}

/**
 * Creates a Zod schema for number with range
 */
export function numberSchema(
  field: string,
  min?: number,
  max?: number,
  required: boolean = true
) {
  let baseSchema = z.number({ message: `${field} must be a number` });

  if (min !== undefined) {
    baseSchema = baseSchema.min(min, VALIDATION_MESSAGES.min(field, min));
  }

  if (max !== undefined) {
    baseSchema = baseSchema.max(max, VALIDATION_MESSAGES.max(field, max));
  }

  if (!required) {
    return baseSchema.optional();
  }

  return baseSchema;
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Composes multiple validators into one
 */
export function composeValidators(
  ...validators: Array<(value: any) => boolean | string>
) {
  return (value: any): boolean | string => {
    for (const validator of validators) {
      const result = validator(value);
      if (result !== true) return result;
    }
    return true;
  };
}

/**
 * Sanitizes input by removing special characters
 */
export function sanitizeInput(value: string): string {
  return value.replace(/[<>{}]/g, '');
}

/**
 * Normalizes phone number to digits only
 */
export function normalizePhoneNumber(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Formats phone number for display (US format)
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = normalizePhoneNumber(phone);
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

/**
 * Validates and formats a credit card number
 */
export function formatCreditCard(value: string): string {
  const cleaned = value.replace(/\s/g, '');
  const chunks = cleaned.match(/.{1,4}/g) || [];
  return chunks.join(' ');
}

/**
 * Validates file size
 */
export function validateFileSize(
  file: File,
  maxSizeMB: number
): boolean | string {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return `File size must not exceed ${maxSizeMB}MB`;
  }
  return true;
}

/**
 * Validates file type
 */
export function validateFileType(
  file: File,
  allowedTypes: string[]
): boolean | string {
  if (!allowedTypes.includes(file.type)) {
    return `File type must be one of: ${allowedTypes.join(', ')}`;
  }
  return true;
}

/**
 * Creates a file validator
 */
export function createFileValidator(
  allowedTypes: string[],
  maxSizeMB: number
) {
  return (file: File): boolean | string => {
    const typeResult = validateFileType(file, allowedTypes);
    if (typeResult !== true) return typeResult;

    const sizeResult = validateFileSize(file, maxSizeMB);
    if (sizeResult !== true) return sizeResult;

    return true;
  };
}
