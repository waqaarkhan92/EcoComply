'use client';

/**
 * Form Examples and Usage Patterns
 *
 * This file demonstrates how to use the enhanced FormField component
 * and form utilities in various scenarios.
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormField } from './FormField';
import {
  emailSchema,
  passwordSchema,
  createEmailUniquenessValidator,
  validateMinLength,
  VALIDATION_MESSAGES,
} from '@/lib/utils/form-validation';
import { useFormWithUnsavedChanges } from '@/lib/hooks/useFormWithUnsavedChanges';
import { useFormAutosave } from '@/lib/hooks/use-form-autosave';
import { useState } from 'react';

// ============================================================================
// EXAMPLE 1: Basic Form with Enhanced Validation
// ============================================================================

const basicFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: emailSchema(true),
  phone: z.string().optional(),
});

type BasicFormData = z.infer<typeof basicFormSchema>;

export function BasicFormExample() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BasicFormData>({
    resolver: zodResolver(basicFormSchema),
  });

  const onSubmit = (data: BasicFormData) => {
    console.log('Form submitted:', data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormField
        name="name"
        label="Full Name"
        type="text"
        placeholder="Enter your full name"
        required
        register={register}
        error={errors.name}
      />

      <FormField
        name="email"
        label="Email Address"
        type="email"
        placeholder="you@example.com"
        required
        register={register}
        error={errors.email}
      />

      <FormField
        name="phone"
        label="Phone Number"
        type="tel"
        placeholder="(555) 123-4567"
        helpText="Optional - We'll only use this for important notifications"
        register={register}
        error={errors.phone}
      />

      <button
        type="submit"
        className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700"
      >
        Submit
      </button>
    </form>
  );
}

// ============================================================================
// EXAMPLE 2: Form with Async Validation (Email Uniqueness)
// ============================================================================

const signupFormSchema = z.object({
  email: emailSchema(true),
  password: passwordSchema(8, true),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type SignupFormData = z.infer<typeof signupFormSchema>;

export function SignupFormWithAsyncValidation() {
  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupFormSchema),
  });

  // Simulated API call to check if email exists
  const checkEmailExists = async (email: string): Promise<boolean> => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    // Simulate checking against a database
    const existingEmails = ['test@example.com', 'admin@example.com'];
    return existingEmails.includes(email.toLowerCase());
  };

  const emailValidator = createEmailUniquenessValidator(checkEmailExists);

  const onSubmit = (data: SignupFormData) => {
    console.log('Signup form submitted:', data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormField
        name="email"
        label="Email Address"
        type="email"
        placeholder="you@example.com"
        required
        register={register}
        error={errors.email}
        asyncValidator={emailValidator}
        setError={setError}
        clearErrors={clearErrors}
        showSuccessState
        helpText="We'll check if this email is available"
      />

      <FormField
        name="password"
        label="Password"
        type="password"
        placeholder="Enter a strong password"
        required
        register={register}
        error={errors.password}
        helpText="Must contain at least 8 characters, one uppercase, one lowercase, one number and one special character"
      />

      <FormField
        name="confirmPassword"
        label="Confirm Password"
        type="password"
        placeholder="Re-enter your password"
        required
        register={register}
        error={errors.confirmPassword}
      />

      <button
        type="submit"
        className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700"
      >
        Create Account
      </button>
    </form>
  );
}

// ============================================================================
// EXAMPLE 3: Form with Unsaved Changes Warning
// ============================================================================

const profileFormSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  bio: z.string().max(500, 'Bio must not exceed 500 characters').optional(),
  website: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
});

type ProfileFormData = z.infer<typeof profileFormSchema>;

export function ProfileFormWithUnsavedChanges() {
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: 'John',
      lastName: 'Doe',
      bio: '',
      website: '',
    },
  });

  const { isDirty: hasUnsavedChanges } = useFormWithUnsavedChanges({
    isDirty,
    message: 'You have unsaved changes to your profile. Are you sure you want to leave?',
    onConfirmNavigation: () => {
      console.log('User confirmed navigation despite unsaved changes');
    },
    onCancelNavigation: () => {
      console.log('User cancelled navigation');
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    console.log('Profile updated:', data);
    // After successful save, reset the form with new values to clear dirty state
    reset(data);
  };

  return (
    <div className="space-y-4">
      {hasUnsavedChanges && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-sm">
          You have unsaved changes
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          name="firstName"
          label="First Name"
          type="text"
          required
          register={register}
          error={errors.firstName}
        />

        <FormField
          name="lastName"
          label="Last Name"
          type="text"
          required
          register={register}
          error={errors.lastName}
        />

        <FormField
          name="bio"
          label="Bio"
          type="textarea"
          placeholder="Tell us about yourself"
          helpText="Maximum 500 characters"
          register={register}
          error={errors.bio}
        />

        <FormField
          name="website"
          label="Website"
          type="url"
          placeholder="https://example.com"
          register={register}
          error={errors.website}
        />

        <div className="flex gap-2">
          <button
            type="submit"
            className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700"
          >
            Save Changes
          </button>
          <button
            type="button"
            onClick={() => reset()}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
          >
            Reset
          </button>
        </div>
      </form>
    </div>
  );
}

// ============================================================================
// EXAMPLE 4: Long Form with Autosave
// ============================================================================

const longFormSchema = z.object({
  projectName: z.string().min(3, 'Project name must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  category: z.string().min(1, 'Please select a category'),
  budget: z.number().min(0, 'Budget must be positive').optional(),
  notes: z.string().optional(),
});

type LongFormData = z.infer<typeof longFormSchema>;

export function LongFormWithAutosave() {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<LongFormData>({
    resolver: zodResolver(longFormSchema),
    defaultValues: {
      projectName: '',
      description: '',
      category: '',
      notes: '',
    },
  });

  // Autosave every 30 seconds or 2 seconds after user stops typing
  const { saveStatus, lastSavedAt, clearSaved } = useFormAutosave({
    watch,
    storageKey: 'long-form-autosave',
    interval: 30000, // 30 seconds
    debounceMs: 2000, // 2 seconds after typing
    restoreOnMount: true,
    onRestore: (data) => {
      // Populate form with restored data
      Object.keys(data).forEach((key) => {
        setValue(key as keyof LongFormData, data[key as keyof LongFormData]);
      });
    },
    onSaveSuccess: () => {
      console.log('Form auto-saved');
    },
  });

  const onSubmit = (data: LongFormData) => {
    console.log('Form submitted:', data);
    clearSaved(); // Clear autosaved data after successful submit
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-md">
        <div className="text-sm text-gray-600">
          {saveStatus === 'saving' && 'Saving...'}
          {saveStatus === 'saved' && lastSavedAt && (
            <span>
              Last saved at {lastSavedAt.toLocaleTimeString()}
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="text-red-600">Failed to save</span>
          )}
          {saveStatus === 'idle' && 'Autosave enabled'}
        </div>
        <div className="flex gap-2 text-xs">
          <span className={`px-2 py-1 rounded ${
            saveStatus === 'saved' ? 'bg-green-100 text-green-800' :
            saveStatus === 'saving' ? 'bg-blue-100 text-blue-800' :
            saveStatus === 'error' ? 'bg-red-100 text-red-800' :
            'bg-gray-100 text-gray-600'
          }`}>
            {saveStatus}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          name="projectName"
          label="Project Name"
          type="text"
          required
          register={register}
          error={errors.projectName}
        />

        <FormField
          name="description"
          label="Description"
          type="textarea"
          required
          register={register}
          error={errors.description}
        />

        <FormField
          name="category"
          label="Category"
          type="select"
          required
          register={register}
          error={errors.category}
        >
          <option value="">Select a category</option>
          <option value="environmental">Environmental</option>
          <option value="sustainability">Sustainability</option>
          <option value="compliance">Compliance</option>
        </FormField>

        <FormField
          name="notes"
          label="Additional Notes"
          type="textarea"
          placeholder="Any additional information..."
          register={register}
          error={errors.notes}
        />

        <button
          type="submit"
          className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700"
        >
          Submit Project
        </button>
      </form>
    </div>
  );
}

// ============================================================================
// EXAMPLE 5: All Features Combined
// ============================================================================

export function ComprehensiveFormExample() {
  const [showForm, setShowForm] = useState(true);

  const formSchema = z.object({
    companyName: z.string().min(2, 'Company name must be at least 2 characters'),
    email: emailSchema(true),
    contactPerson: z.string().min(2, 'Contact person must be at least 2 characters'),
    industry: z.string().min(1, 'Please select an industry'),
    employeeCount: z.number().min(1, 'Employee count must be at least 1').optional(),
    comments: z.string().optional(),
  });

  type ComprehensiveFormData = z.infer<typeof formSchema>;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    clearErrors,
    formState: { errors, isDirty },
    reset,
  } = useForm<ComprehensiveFormData>({
    resolver: zodResolver(formSchema),
  });

  // Unsaved changes warning
  useFormWithUnsavedChanges({
    isDirty,
    enabled: true,
  });

  // Autosave
  const { saveStatus, lastSavedAt } = useFormAutosave({
    watch,
    storageKey: 'comprehensive-form',
    interval: 30000,
    restoreOnMount: true,
    onRestore: (data) => {
      Object.keys(data).forEach((key) => {
        setValue(key as keyof ComprehensiveFormData, data[key as keyof ComprehensiveFormData]);
      });
    },
  });

  // Async email validation
  const checkEmailExists = async (email: string): Promise<boolean> => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return email === 'taken@example.com';
  };

  const onSubmit = (data: ComprehensiveFormData) => {
    console.log('Comprehensive form submitted:', data);
    reset();
    setShowForm(false);
  };

  if (!showForm) {
    return (
      <div className="p-6 bg-green-50 border border-green-200 rounded-md">
        <h3 className="text-lg font-semibold text-green-800 mb-2">
          Form Submitted Successfully!
        </h3>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700"
        >
          Submit Another
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
        <p className="text-sm text-blue-800">
          This form demonstrates all features: real-time validation, async validation,
          autosave, and unsaved changes warning.
        </p>
      </div>

      {saveStatus !== 'idle' && (
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-md text-sm">
          {saveStatus === 'saving' && 'Saving draft...'}
          {saveStatus === 'saved' && lastSavedAt && (
            <span>Draft saved at {lastSavedAt.toLocaleTimeString()}</span>
          )}
          {saveStatus === 'error' && (
            <span className="text-red-600">Failed to save draft</span>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          name="companyName"
          label="Company Name"
          type="text"
          placeholder="Acme Corporation"
          required
          register={register}
          error={errors.companyName}
        />

        <FormField
          name="email"
          label="Company Email"
          type="email"
          placeholder="contact@company.com"
          required
          register={register}
          error={errors.email}
          asyncValidator={createEmailUniquenessValidator(checkEmailExists)}
          setError={setError}
          clearErrors={clearErrors}
          showSuccessState
          helpText="We'll verify this email is available"
        />

        <FormField
          name="contactPerson"
          label="Contact Person"
          type="text"
          placeholder="John Doe"
          required
          register={register}
          error={errors.contactPerson}
        />

        <FormField
          name="industry"
          label="Industry"
          type="select"
          required
          register={register}
          error={errors.industry}
        >
          <option value="">Select an industry</option>
          <option value="manufacturing">Manufacturing</option>
          <option value="energy">Energy</option>
          <option value="construction">Construction</option>
          <option value="agriculture">Agriculture</option>
          <option value="other">Other</option>
        </FormField>

        <FormField
          name="comments"
          label="Comments"
          type="textarea"
          placeholder="Tell us about your compliance needs..."
          register={register}
          error={errors.comments}
        />

        <button
          type="submit"
          className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700"
        >
          Submit Inquiry
        </button>
      </form>
    </div>
  );
}
