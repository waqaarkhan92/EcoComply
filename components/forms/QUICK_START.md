# Quick Start Guide - Enhanced Forms

Get started with the enhanced form system in 5 minutes.

## Installation

All dependencies are already installed. You can start using the components immediately.

## Basic Form (30 seconds)

```tsx
'use client';

import { useForm } from 'react-hook-form';
import { FormField } from '@/components/forms';

export default function MyForm() {
  const { register, handleSubmit, formState: { errors } } = useForm();

  return (
    <form onSubmit={handleSubmit((data) => console.log(data))}>
      <FormField
        name="email"
        label="Email"
        type="email"
        required
        register={register}
        error={errors.email}
      />
      <button type="submit">Submit</button>
    </form>
  );
}
```

## Form with Validation (2 minutes)

```tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormField, emailSchema, passwordSchema } from '@/components/forms';

const schema = z.object({
  email: emailSchema(true),
  password: passwordSchema(8, true),
});

export default function SignupForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  return (
    <form onSubmit={handleSubmit((data) => console.log(data))}>
      <FormField
        name="email"
        label="Email"
        type="email"
        required
        register={register}
        error={errors.email}
      />
      <FormField
        name="password"
        label="Password"
        type="password"
        required
        register={register}
        error={errors.password}
        helpText="Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char"
      />
      <button type="submit">Sign Up</button>
    </form>
  );
}
```

## Form with Async Validation (3 minutes)

```tsx
'use client';

import { useForm } from 'react-hook-form';
import { FormField, createEmailUniquenessValidator } from '@/components/forms';

export default function RegistrationForm() {
  const { register, setError, clearErrors, handleSubmit, formState: { errors } } = useForm();

  // Check if email exists in your database
  const checkEmailExists = async (email: string) => {
    const response = await fetch(`/api/check-email?email=${email}`);
    const data = await response.json();
    return data.exists;
  };

  const emailValidator = createEmailUniquenessValidator(checkEmailExists);

  return (
    <form onSubmit={handleSubmit((data) => console.log(data))}>
      <FormField
        name="email"
        label="Email"
        type="email"
        required
        register={register}
        error={errors.email}
        asyncValidator={emailValidator}
        setError={setError}
        clearErrors={clearErrors}
        showSuccessState
      />
      <button type="submit">Register</button>
    </form>
  );
}
```

## Form with Unsaved Changes Warning (3 minutes)

```tsx
'use client';

import { useForm } from 'react-hook-form';
import { FormField, useFormWithUnsavedChanges } from '@/components/forms';

export default function ProfileForm() {
  const { register, handleSubmit, formState: { errors, isDirty }, reset } = useForm();

  // Add unsaved changes warning
  useFormWithUnsavedChanges({
    isDirty,
    message: 'You have unsaved changes. Are you sure you want to leave?',
  });

  const onSubmit = (data: any) => {
    console.log(data);
    reset(data); // Reset to clear dirty state after save
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FormField name="name" label="Name" required register={register} error={errors.name} />
      <FormField name="bio" label="Bio" type="textarea" register={register} error={errors.bio} />
      <button type="submit">Save</button>
    </form>
  );
}
```

## Form with Autosave (4 minutes)

```tsx
'use client';

import { useForm } from 'react-hook-form';
import { FormField, useFormAutosave, FormSaveStatus } from '@/components/forms';

export default function DraftForm() {
  const { register, watch, setValue, handleSubmit, formState: { errors } } = useForm();

  // Autosave to localStorage
  const { saveStatus, lastSavedAt, clearSaved } = useFormAutosave({
    watch,
    storageKey: 'my-draft',
    interval: 30000, // Save every 30 seconds
    restoreOnMount: true,
    onRestore: (data) => {
      // Restore saved data to form
      Object.keys(data).forEach((key) => {
        setValue(key, data[key]);
      });
    },
  });

  const onSubmit = (data: any) => {
    console.log(data);
    clearSaved(); // Clear draft after submission
  };

  return (
    <div>
      <FormSaveStatus status={saveStatus} lastSavedAt={lastSavedAt} variant="banner" />

      <form onSubmit={handleSubmit(onSubmit)} className="mt-4">
        <FormField name="title" label="Title" required register={register} error={errors.title} />
        <FormField name="content" label="Content" type="textarea" register={register} error={errors.content} />
        <button type="submit">Publish</button>
      </form>
    </div>
  );
}
```

## Everything Together (5 minutes)

```tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  FormField,
  FormSaveStatus,
  FormErrorBoundary,
  emailSchema,
  createEmailUniquenessValidator,
  useFormWithUnsavedChanges,
  useFormAutosave,
} from '@/components/forms';

const schema = z.object({
  companyName: z.string().min(2),
  email: emailSchema(true),
  description: z.string().min(10),
});

export default function CompleteDemoForm() {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    clearErrors,
    formState: { errors, isDirty },
    reset,
  } = useForm({
    resolver: zodResolver(schema),
  });

  // Unsaved changes warning
  useFormWithUnsavedChanges({ isDirty });

  // Autosave
  const { saveStatus, lastSavedAt, clearSaved } = useFormAutosave({
    watch,
    storageKey: 'complete-demo',
    interval: 30000,
    restoreOnMount: true,
    onRestore: (data) => {
      Object.keys(data).forEach((key) => setValue(key, data[key]));
    },
  });

  // Async validation
  const checkEmail = async (email: string) => {
    const res = await fetch(`/api/check-email?email=${email}`);
    return (await res.json()).exists;
  };

  const onSubmit = (data: any) => {
    console.log(data);
    clearSaved();
    reset();
  };

  return (
    <FormErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Complete Demo Form</h1>

        <FormSaveStatus
          status={saveStatus}
          lastSavedAt={lastSavedAt}
          variant="banner"
          className="mb-4"
        />

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            name="companyName"
            label="Company Name"
            required
            register={register}
            error={errors.companyName}
          />

          <FormField
            name="email"
            label="Email"
            type="email"
            required
            register={register}
            error={errors.email}
            asyncValidator={createEmailUniquenessValidator(checkEmail)}
            setError={setError}
            clearErrors={clearErrors}
            showSuccessState
          />

          <FormField
            name="description"
            label="Description"
            type="textarea"
            required
            register={register}
            error={errors.description}
          />

          <button
            type="submit"
            className="w-full px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700"
          >
            Submit
          </button>
        </form>
      </div>
    </FormErrorBoundary>
  );
}
```

## API Endpoint Example

Create an API endpoint for email checking at `/app/api/check-email/route.ts`:

```tsx
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 });
  }

  const supabase = createClient();

  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single();

  return NextResponse.json({ exists: !!data });
}
```

## Common Use Cases

### 1. Contact Form
```tsx
<FormField name="name" label="Name" required register={register} error={errors.name} />
<FormField name="email" label="Email" type="email" required register={register} error={errors.email} />
<FormField name="message" label="Message" type="textarea" required register={register} error={errors.message} />
```

### 2. Login Form
```tsx
<FormField name="email" label="Email" type="email" required register={register} error={errors.email} />
<FormField name="password" label="Password" type="password" required register={register} error={errors.password} />
```

### 3. Settings Form with Autosave
```tsx
const { saveStatus } = useFormAutosave({ watch, storageKey: 'settings' });
<FormSaveStatusBadge status={saveStatus} />
```

### 4. Multi-step Form with Progress
```tsx
useFormWithUnsavedChanges({ isDirty, enabled: currentStep > 0 });
```

## Tips

1. **Always use Zod schemas** for better type safety and validation
2. **Enable `showSuccessState`** for critical fields like email/username
3. **Set appropriate debounce** (500ms for async validation, 2000ms for autosave)
4. **Use `FormErrorBoundary`** at the form level for production apps
5. **Clear autosave data** after successful submission
6. **Reset form** after submission to clear dirty state

## Next Steps

- Read the full [README.md](./README.md) for detailed documentation
- Check [FormExamples.tsx](./FormExamples.tsx) for more examples
- Explore validation utilities in `/lib/utils/form-validation.ts`
- Customize error messages in `VALIDATION_MESSAGES`

## Support

For issues or questions, refer to the main documentation or check existing forms in the codebase for real-world examples.
